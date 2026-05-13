import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Trash2, PlusCircle,
  AlertTriangle, X, Check, Landmark, Map,
} from 'lucide-react'
import {
  MapContainer, TileLayer, Circle, Marker, Tooltip, useMap, useMapEvents, GeoJSON,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import adminAPI from '../api/api'
import { fmtDate, fmtDateTime } from '../utils/helpers'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const redPin = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
})

const ZONE_RING_COLORS = ['#1d4ed8', '#15803d', '#b45309', '#7e22ce']

const NOMINATIM_HEADERS = {
  'Accept-Language': 'en',
  'User-Agent': 'TadipaarAdmin/1.0 (geofence map preview)',
}

async function fetchPuneDistrictFeature(signal) {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: 'Pune District, Maharashtra, India',
      format: 'json',
      limit: '1',
      polygon_geojson: '1',
    })
  const res = await fetch(url, { headers: NOMINATIM_HEADERS, signal })
  if (!res.ok) throw new Error('Pune boundary request failed')
  const data = await res.json()
  const g = data?.[0]?.geojson
  if (!g) throw new Error('No Pune geometry')
  return { type: 'Feature', properties: { name: 'Pune District' }, geometry: g }
}

function MapClickHandler({ enabled, onPick }) {
  useMapEvents({
    click: (e) => {
      if (enabled) onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapInvalidateSize({ tick }) {
  const map = useMap()
  useEffect(() => {
    const run = () => map.invalidateSize({ animate: false })
    run()
    const raf = requestAnimationFrame(run)
    const t1 = window.setTimeout(run, 120)
    const t2 = window.setTimeout(run, 400)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map, tick])
  return null
}

function FitCombinedMapBounds({ puneFeature, zonesDraw, stationsDraw, showStationCircles }) {
  const map = useMap()
  useEffect(() => {
    try {
      let b = null
      const add = (bb) => {
        if (bb?.isValid?.()) b = b ? b.extend(bb) : bb
      }
      if (puneFeature?.geometry) {
        try {
          add(L.geoJSON(puneFeature).getBounds())
        } catch (_) { /* ignore */ }
      }
      const extendCircle = (lat, lng, radiusKm) => {
        const c = L.circle([lat, lng], { radius: Math.max(radiusKm, 0.5) * 1000 })
        add(c.getBounds())
      }
      ;(zonesDraw || []).forEach((z) => extendCircle(z.latitude, z.longitude, z.radiusKm))
      if (showStationCircles) {
        ;(stationsDraw || []).forEach((s) => extendCircle(s.latitude, s.longitude, s.radiusKm))
      }
      if (b?.isValid?.()) {
        map.fitBounds(b, { padding: [26, 26], maxZoom: 11 })
      } else if (puneFeature?.geometry) {
        try {
          const pb = L.geoJSON(puneFeature).getBounds()
          if (pb.isValid()) map.fitBounds(pb, { padding: [20, 20], maxZoom: 11 })
        } catch (_) {
          map.setView([18.62, 73.82], 10)
        }
      } else {
        map.setView([18.62, 73.82], 10)
      }
    } catch (_) {
      map.setView([18.62, 73.82], 10)
    }
    const t = window.setTimeout(() => map.invalidateSize({ animate: false }), 250)
    return () => clearTimeout(t)
  }, [map, puneFeature, zonesDraw, stationsDraw, showStationCircles])
  return null
}

function GeofencePreviewMap({
  zones,
  policeStations,
  showStationCircles,
  pin,
  pinInteractive,
  onPinPick,
  puneDistrictFeature,
  height = 280,
}) {
  const zonesDraw = useMemo(
    () =>
      (zones || []).filter(
        (z) => z.configured && Number.isFinite(z.latitude) && Number.isFinite(z.longitude) && Number.isFinite(z.radiusKm)
      ),
    [zones]
  )
  const stationsDraw = useMemo(
    () =>
      (policeStations || []).filter(
        (s) => s.configured && Number.isFinite(s.latitude) && Number.isFinite(s.longitude) && Number.isFinite(s.radiusKm)
      ),
    [policeStations]
  )
  const invalidateTick = `${zonesDraw.length}-${stationsDraw.length}-${showStationCircles}-${pinInteractive}-${puneDistrictFeature ? 'p' : 'n'}-${pin ? `${pin.lat.toFixed(4)},${pin.lng.toFixed(4)}` : '-'}`

  return (
    <div
      className="w-full min-w-0 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm bg-slate-100"
      style={{ height, minHeight: height }}
    >
      <MapContainer
        center={[18.62, 73.82]}
        zoom={10}
        style={{ height: '100%', width: '100%', minHeight: height }}
        scrollWheelZoom
        dragging
        doubleClickZoom={pinInteractive}
      >
        <MapInvalidateSize tick={invalidateTick} />
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {puneDistrictFeature && (
          <GeoJSON
            data={puneDistrictFeature}
            style={{
              color:       '#0f172a',
              weight:      2.5,
              dashArray:   '6 10',
              fillColor:   '#0ea5e9',
              fillOpacity: 0.04,
            }}
          />
        )}
        <FitCombinedMapBounds
          puneFeature={puneDistrictFeature}
          zonesDraw={zonesDraw}
          stationsDraw={stationsDraw}
          showStationCircles={showStationCircles}
        />
        {zonesDraw.map((z, i) => (
          <Circle
            key={`z-${z.id}`}
            center={[z.latitude, z.longitude]}
            radius={Math.max(z.radiusKm, 0.5) * 1000}
            pathOptions={{
              color:       ZONE_RING_COLORS[i % ZONE_RING_COLORS.length],
              weight:      2.5,
              opacity:     0.95,
              fillColor:   ZONE_RING_COLORS[i % ZONE_RING_COLORS.length],
              fillOpacity: 0.06,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
              {z.name} (~{z.radiusKm} km)
            </Tooltip>
          </Circle>
        ))}
        {showStationCircles &&
          stationsDraw.map((s) => (
            <Circle
              key={`ps-${s.id}`}
              center={[s.latitude, s.longitude]}
              radius={Math.max(s.radiusKm, 0.3) * 1000}
              pathOptions={{
                color:       '#64748b',
                weight:      1,
                dashArray:   '4 6',
                opacity:     0.75,
                fillOpacity: 0,
              }}
            />
          ))}
        <MapClickHandler enabled={pinInteractive} onPick={onPinPick} />
        {pin && <Marker position={[pin.lat, pin.lng]} icon={redPin} />}
      </MapContainer>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  Add restricted area — list (preset) or pin on map + zone preview
// ══════════════════════════════════════════════════════════
const AddAreaForm = ({ criminalId, onAdded }) => {
  const [open, setOpen] = useState(false)
  const [entryMode, setEntryMode] = useState('list')
  const [presetKind, setPresetKind] = useState('police_station')
  const [presets, setPresets] = useState({ zones: [], policeStations: [] })
  const [presetsLoading, setPresetsLoading] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [selectedPsId, setSelectedPsId] = useState('')
  const [showStationCircles, setShowStationCircles] = useState(false)
  const [pin, setPin] = useState(null)
  const [pinAreaName, setPinAreaName] = useState('')
  const [pinRadiusKm, setPinRadiusKm] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [puneDistrictFeature, setPuneDistrictFeature] = useState(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setPresetsLoading(true)
    setError('')
    setPuneDistrictFeature(null)

    const ac = new AbortController()
    const to = window.setTimeout(() => ac.abort(), 24000)

    Promise.allSettled([
      adminAPI.get('/admin/geofence-presets'),
      fetchPuneDistrictFeature(ac.signal),
    ])
      .then((results) => {
        if (!active) return
        const [presetR, puneR] = results
        if (presetR.status === 'fulfilled') {
          const d = presetR.value.data || {}
          setPresets({
            zones:            Array.isArray(d.zones) ? d.zones : (d.zones_list || []),
            policeStations:   Array.isArray(d.policeStations) ? d.policeStations : (d.police_stations || []),
          })
        } else {
          const err = presetR.reason
          const msg = err?.response?.data?.message || err?.message || 'request failed'
          setPresets({ zones: [], policeStations: [] })
          setError(`Could not load zones / police stations (${msg}). Check VITE_API_BASE_URL, admin login, and that the API is running.`)
        }
        if (puneR.status === 'fulfilled' && puneR.value) {
          setPuneDistrictFeature(puneR.value)
        }
      })
      .finally(() => {
        clearTimeout(to)
        if (active) setPresetsLoading(false)
      })

    return () => {
      active = false
      ac.abort()
      clearTimeout(to)
    }
  }, [open])

  const reset = () => {
    setOpen(false)
    setError('')
    setSuccess('')
    setSelectedZoneId('')
    setSelectedPsId('')
    setPresetKind('police_station')
    setEntryMode('list')
    setPin(null)
    setPinAreaName('')
    setPinRadiusKm('1')
    setShowStationCircles(false)
    setPuneDistrictFeature(null)
  }

  const onKindChange = (kind) => {
    setPresetKind(kind)
    setSelectedZoneId('')
    setSelectedPsId('')
    setError('')
  }

  const onPinPick = useCallback((lat, lng) => {
    setPin({ lat, lng })
    setError('')
  }, [])

  const handleAddList = async () => {
    setError('')
    setSuccess('')
    if (presetKind === 'police_station' && !selectedPsId) {
      setError('Select a police station from the list.')
      return
    }
    if (presetKind === 'zone' && !selectedZoneId) {
      setError('Select a zone from the list.')
      return
    }
    setSaving(true)
    try {
      const body = { criminalId: parseInt(criminalId, 10) }
      if (presetKind === 'police_station') body.policeStationId = parseInt(selectedPsId, 10)
      else body.zoneId = parseInt(selectedZoneId, 10)
      await adminAPI.post('/admin/areas', body)
      setSuccess('Restricted area added.')
      setSelectedZoneId('')
      setSelectedPsId('')
      onAdded()
      setTimeout(() => {
        setSuccess('')
        setOpen(false)
      }, 1400)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to add area.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPin = async () => {
    setError('')
    setSuccess('')
    if (!pin) {
      setError('Click the map to drop a pin.')
      return
    }
    if (!pinAreaName.trim()) {
      setError('Enter a label for this zone (shown on the app).')
      return
    }
    const r = parseFloat(pinRadiusKm || '1')
    if (Number.isNaN(r) || r < 0.1) {
      setError('Radius must be at least 0.1 km.')
      return
    }
    setSaving(true)
    try {
      await adminAPI.post('/admin/areas', {
        criminalId: parseInt(criminalId, 10),
        areaName:   pinAreaName.trim(),
        latitude:   pin.lat,
        longitude:  pin.lng,
        radiusKm:   r,
      })
      setSuccess('Restricted area added.')
      setPin(null)
      setPinAreaName('')
      setPinRadiusKm('1')
      onAdded()
      setTimeout(() => {
        setSuccess('')
        setOpen(false)
      }, 1400)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to add area.')
    } finally {
      setSaving(false)
    }
  }

  const sel = 'w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'
  const zones = presets.zones || []
  const stations = presets.policeStations || []
  const zonesConfigured = zones.filter((z) => z.configured)
  const stationsConfigured = stations.filter((s) => s.configured)
  const hasAnyMapCircles =
    zonesConfigured.some((z) => Number.isFinite(z.latitude) && Number.isFinite(z.longitude)) ||
    stationsConfigured.some((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold text-[#1E3A8A] hover:text-blue-900 transition-colors"
        >
          <PlusCircle size={16} /> Add Restricted Area
        </button>
      ) : (
        <div className="w-full min-w-0 bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
              <Landmark size={15} /> Restricted zones
            </p>
            <button type="button" onClick={reset} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            <strong>Pune district</strong> outline (dark dashed) is from OpenStreetMap. <strong>Coloured rings</strong> are zone geofence presets (~km radius). Optional grey dashed rings: police stations. Use the list for station/zone names, or <strong>Pin on map</strong> for a custom circle.
          </p>

          {error && (
            <p className="text-xs text-red-600 bg-red-100 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>
          )}
          {success && (
            <p className="text-xs text-green-700 bg-green-100 border border-green-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-1">
              <Check size={12} />
              {success}
            </p>
          )}

          {!presetsLoading && !error && !hasAnyMapCircles && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 leading-relaxed">
              No geofence coordinates in the database yet (zones/stations need <code className="font-mono bg-amber-100/80 px-1 rounded">geofence_*</code> columns filled).
              Restart the API so <strong>initializeGeofencePresets</strong> runs, or run your SQL migration. You can still use <strong>Pin on map</strong> below.
            </div>
          )}

          {!presetsLoading && (
            <div className="mb-4 w-full min-w-0">
              <GeofencePreviewMap
                zones={zones}
                policeStations={stations}
                showStationCircles={showStationCircles}
                pin={entryMode === 'pin' ? pin : null}
                pinInteractive={entryMode === 'pin'}
                onPinPick={onPinPick}
                puneDistrictFeature={puneDistrictFeature}
                height={300}
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-600 leading-tight">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-6 rounded-sm border-2 border-dashed border-slate-800 bg-sky-100/40" />
                  Pune district (OSM)
                </span>
                {ZONE_RING_COLORS.map((c, i) => (
                  <span key={c} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: c }} />
                    Zone ring {i + 1}
                  </span>
                ))}
              </div>
              {hasAnyMapCircles && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showStationCircles}
                      onChange={(e) => setShowStationCircles(e.target.checked)}
                      className="rounded border-slate-300 text-blue-700 focus:ring-red-400"
                    />
                    Show police station circles (grey dashed)
                  </label>
                  <span className="text-slate-400">|</span>
                  <span>Hover a coloured ring for zone name.</span>
                </div>
              )}
            </div>
          )}

          {presetsLoading && (
            <p className="text-xs text-gray-500 py-4 text-center mb-3">Loading map &amp; jurisdiction data…</p>
          )}

          {!presetsLoading && zonesConfigured.length === 0 && stationsConfigured.length === 0 && (
            <p className="text-xs text-slate-600 mb-3">
              List selection is disabled until coordinates exist. Use <strong>Pin on map</strong> to add a custom restricted circle.
            </p>
          )}
          <div className="flex bg-white rounded-xl border border-red-200 p-1 mb-4 gap-1">
            {[
              { key: 'list', label: 'From list', icon: Landmark },
              { key: 'pin', label: 'Pin on map', icon: Map },
            ].map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setEntryMode(m.key)
                  setError('')
                  if (m.key === 'list') setPin(null)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  entryMode === m.key ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <m.icon size={13} /> {m.label}
              </button>
            ))}
          </div>

          {entryMode === 'list' && (
            <>
              <div className="flex bg-white rounded-xl border border-red-200 p-1 mb-4 gap-1">
                {[
                  { key: 'police_station', label: 'Police station' },
                  { key: 'zone', label: 'Entire zone' },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => onKindChange(m.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      presetKind === m.key ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {presetsLoading ? (
                <p className="text-xs text-gray-500 py-6 text-center">Loading…</p>
              ) : (
                <>
                  {presetKind === 'police_station' && (
                    <div className="mb-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Police station
                      </label>
                      <select
                        className={sel}
                        value={selectedPsId}
                        onChange={(e) => setSelectedPsId(e.target.value)}
                      >
                        <option value="">Select station…</option>
                        {stationsConfigured.length === 0 && (
                          <option value="" disabled>No stations with map coordinates</option>
                        )}
                        {(stationsConfigured).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.zone} › {s.acpArea} › {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {presetKind === 'zone' && (
                    <div className="mb-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Zone
                      </label>
                      <select
                        className={sel}
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                      >
                        <option value="">Select zone…</option>
                        {zonesConfigured.length === 0 && (
                          <option value="" disabled>No zones with map coordinates</option>
                        )}
                        {(zonesConfigured).map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} (≈ {z.radiusKm} km radius)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleAddList}
                disabled={
                  saving ||
                  presetsLoading ||
                  (zonesConfigured.length === 0 && stationsConfigured.length === 0) ||
                  (presetKind === 'police_station' ? !selectedPsId : !selectedZoneId)
                }
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : (
                  <>
                    <AlertTriangle size={14} /> Add from list
                  </>
                )}
              </button>
            </>
          )}

          {entryMode === 'pin' && (
            <>
              <p className="text-xs text-gray-600 mb-3">
                <MapPin size={11} className="inline mr-1" />
                Click the map to place the centre of the forbidden circle. Radius applies around that point.
              </p>
              <div className="grid grid-cols-1 gap-3 mb-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Zone label (app)
                  </label>
                  <input
                    className={sel}
                    placeholder="e.g. Near Shivajinagar"
                    value={pinAreaName}
                    onChange={(e) => setPinAreaName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Radius (km)
                  </label>
                  <input
                    className={sel}
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={pinRadiusKm}
                    onChange={(e) => setPinRadiusKm(e.target.value)}
                  />
                </div>
              </div>
              {pin && (
                <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 font-mono">
                  {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                </p>
              )}
              <button
                type="button"
                onClick={handleAddPin}
                disabled={saving || presetsLoading || !pin}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : (
                  <>
                    <Map size={14} /> Save pinned zone
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  Small reusable components
// ══════════════════════════════════════════════════════════
const Chip = ({ label, color = 'blue' }) => {
  const c = {
    blue:   'bg-blue-100   text-blue-700',
    green:  'bg-green-100  text-green-700',
    red:    'bg-red-100    text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c[color] || c.blue}`}>{label}</span>
}

const InfoRow = ({ label, value }) =>
  value ? (
    <div className="flex justify-between py-2.5 border-b border-gray-50 text-sm last:border-0">
      <span className="text-gray-400 font-medium">{label}</span>
      <span className="font-semibold text-gray-800 text-right max-w-xs">{value}</span>
    </div>
  ) : null

const Section = ({ title, children, badge }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
      {badge}
    </div>
    {children}
  </div>
)

// ══════════════════════════════════════════════════════════
//  Main CriminalProfile Page
// ══════════════════════════════════════════════════════════
export default function CriminalProfile() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [data,      setData]    = useState(null)
  const [loading,   setLoading] = useState(true)
  const [deleting,  setDeleting] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    adminAPI.get(`/admin/criminals/${id}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const deleteArea = async (areaId) => {
    if (!window.confirm('Remove this restricted area?')) return
    setDeleting(areaId)
    try {
      await adminAPI.delete(`/admin/areas/${areaId}`)
      load()
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed.')
    } finally { setDeleting(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>
  )
  if (!data) return (
    <div className="text-center py-16 text-gray-400">Criminal not found</div>
  )

  const { criminal, recentCheckIns = [], restrictedAreas = [] } = data

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-700 mb-6 text-sm font-medium">
        <ArrowLeft size={16} /> Back to List
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div>
          <Section title="Profile">
            <div className="flex flex-col items-center mb-5">
              {criminal.photoUrl
                ? <img src={criminal.photoUrl} className="w-28 h-28 rounded-full object-cover border-4 border-blue-100 mb-3" alt="" />
                : <div className="w-28 h-28 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-4xl font-black mb-3">
                    {criminal.name?.charAt(0)}
                  </div>
              }
              <h2 className="text-xl font-bold text-gray-800 text-center">{criminal.name}</h2>
              <p className="text-gray-400 text-sm mt-1">{criminal.loginId || criminal.login_id}</p>
              <div className="flex gap-2 mt-2 flex-wrap justify-center">
                {criminal.externmentSection && <Chip label={`Section ${criminal.externmentSection}`} color="purple" />}
                {criminal.isActive ? <Chip label="Active" color="green" /> : <Chip label="Inactive" color="red" />}
              </div>
            </div>
            <InfoRow label="Phone"      value={criminal.phone} />
            <InfoRow label="Email"      value={criminal.email} />
            <InfoRow label="Case No."   value={criminal.caseNumber || criminal.case_number} />
            <InfoRow label="Registered" value={fmtDate(criminal.createdAt)} />
          </Section>

          <Section title="Jurisdiction">
            <InfoRow label="Zone"           value={criminal.zone} />
            <InfoRow label="ACP Area"       value={criminal.acpArea || criminal.acp_area} />
            <InfoRow label="Police Station" value={criminal.policeStation || criminal.police_station} />
          </Section>
        </div>

        <div className="lg:col-span-2 min-w-0">
          <Section title="Externment Details">
            <InfoRow label="Section"      value={criminal.externmentSection ? `Section ${criminal.externmentSection}` : null} />
            <InfoRow label="Period From"  value={fmtDate(criminal.periodFrom  || criminal.period_from)} />
            <InfoRow label="Period Till"  value={fmtDate(criminal.periodTill  || criminal.period_till)} />
            <InfoRow label="Home Address" value={criminal.address} />
            <InfoRow label="Residing At"  value={criminal.residenceAddress || criminal.residence_address} />
          </Section>

          <Section
            title={`Restricted Areas (${restrictedAreas.length})`}
            badge={
              <span className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                Geo-fenced
              </span>
            }
          >
            {restrictedAreas.length === 0 ? (
              <div className="text-center py-4">
                <AlertTriangle size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-medium">No restricted areas defined yet.</p>
                <p className="text-gray-300 text-xs mt-1">
                  The mobile app will automatically flag violations when areas are added.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {restrictedAreas.map((area) => {
                  const psPreset = area.source_police_station_id != null
                  const zonePreset = area.source_zone_id != null
                  return (
                    <div key={area.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-gray-800">{area.area_name}</p>
                            {psPreset && <Chip label="Police station" color="blue" />}
                            {zonePreset && <Chip label="Zone" color="purple" />}
                            {!psPreset && !zonePreset && <Chip label="Custom pin" color="red" />}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {parseFloat(area.latitude).toFixed(5)}, {parseFloat(area.longitude).toFixed(5)}
                            {' • '}
                            <span className="text-red-500 font-semibold">{area.radius_km} km radius</span>
                          </p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${area.latitude},${area.longitude}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-blue-400 hover:underline mt-0.5 inline-flex items-center gap-1"
                          >
                            <MapPin size={9} /> View on Maps
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteArea(area.id)}
                        disabled={deleting === area.id}
                        className="p-2 text-red-300 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <AddAreaForm criminalId={id} onAdded={load} />
          </Section>

          <Section title="Recent Check-ins (last 10)">
            {recentCheckIns.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No check-ins yet</p>
            ) : (
              <div className="space-y-3">
                {recentCheckIns.map((ci, i) => (
                  <div key={i} className={`flex items-start gap-3 rounded-xl p-3 border ${ci.status === 'compliant' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    {ci.selfie_url && (
                      <img src={ci.selfie_url} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white shadow-sm" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-xs text-gray-400">{fmtDateTime(ci.checked_in_at)}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${ci.status === 'compliant' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                          {ci.status === 'compliant' ? '✓ Compliant' : '✗ Violation'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{parseFloat(ci.latitude || 0).toFixed(5)}, {parseFloat(ci.longitude || 0).toFixed(5)}</p>
                      {ci.violation_reason && <p className="text-xs text-red-600 mt-1 font-medium leading-tight">{ci.violation_reason}</p>}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${ci.latitude},${ci.longitude}`} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline mt-1 inline-flex items-center gap-1">
                        <MapPin size={10} /> View on Maps
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
