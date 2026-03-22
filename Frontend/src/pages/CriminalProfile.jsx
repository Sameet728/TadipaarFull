import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Trash2, PlusCircle,
  AlertTriangle, Search, Map, X, Check,
  ChevronDown,
} from 'lucide-react'
import adminAPI from '../api/api'
import { fmtDate, fmtDateTime } from '../utils/helpers'

// ── Leaflet (map) — loaded dynamically so SSR-safe ────────
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons broken by webpack/vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const redIcon = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
})

// ── Map click handler + auto-center ───────────────────────
function MapClickHandler({ onPick }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}
function FlyTo({ lat, lng }) {
  const map = useMap()
  useEffect(() => { if (lat && lng) map.flyTo([lat, lng], 15, { duration: 1 }) }, [lat, lng])
  return null
}

// ── Nominatim (OSM) geocoding — free, no API key ──────────
const searchPlace = async (q) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=in`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  return res.json()
}

// ── Reverse geocode ────────────────────────────────────────
const reverseGeocode = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  const d   = await res.json()
  return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

// ══════════════════════════════════════════════════════════
//  Add Area Form
// ══════════════════════════════════════════════════════════
const AddAreaForm = ({ criminalId, onAdded }) => {
  const [open,       setOpen]       = useState(false)
  const [mode,       setMode]       = useState('search')   // 'search' | 'map'
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState([])
  const [searching,  setSearching]  = useState(false)
  const [pin,        setPin]        = useState(null)        // { lat, lng, label }
  const [radiusKm,   setRadiusKm]   = useState('1')
  const [areaName,   setAreaName]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const searchTimer = useRef(null)

  // ── Live search as user types ──────────────────────────
  const handleQueryChange = (val) => {
    setQuery(val)
    clearTimeout(searchTimer.current)
    if (val.trim().length < 2) { setResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchPlace(val + ' Maharashtra')
        setResults(data)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
  }

  // ── User picks a search result ─────────────────────────
  const pickResult = (r) => {
    const lat  = parseFloat(r.lat)
    const lng  = parseFloat(r.lon)
    const name = r.display_name.split(',').slice(0, 3).join(', ')
    setPin({ lat, lng, label: name })
    setAreaName(name)
    setQuery(name)
    setResults([])
  }

  // ── User clicks on map ─────────────────────────────────
  const pickFromMap = useCallback(async (lat, lng) => {
    setPin({ lat, lng, label: 'Fetching address...' })
    try {
      const label = await reverseGeocode(lat, lng)
      const name  = label.split(',').slice(0, 3).join(', ')
      setPin({ lat, lng, label: name })
      if (!areaName) setAreaName(name)
      setQuery(name)
    } catch {
      setPin({ lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` })
    }
  }, [areaName])

  // ── Submit ─────────────────────────────────────────────
  const handleAdd = async () => {
    if (!areaName.trim()) { setError('Area name is required.'); return }
    if (!pin)             { setError('Pick a location first.'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      await adminAPI.post('/admin/areas', {
        criminalId,
        areaName:  areaName.trim(),
        latitude:  pin.lat,
        longitude: pin.lng,
        radiusKm:  parseFloat(radiusKm || 1),
      })
      setSuccess('Restricted area added!')
      setPin(null); setQuery(''); setAreaName(''); setRadiusKm('1'); setResults([])
      onAdded()
      setTimeout(() => { setSuccess(''); setOpen(false) }, 1500)
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to add area.')
    } finally { setSaving(false) }
  }

  const reset = () => {
    setOpen(false); setPin(null); setQuery(''); setAreaName('')
    setResults([]); setError(''); setSuccess('')
  }

  const inp = 'w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400'

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">

      {/* Toggle button */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold text-[#1E3A8A] hover:text-blue-900 transition-colors"
        >
          <PlusCircle size={16} /> Add Restricted Area
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={15} /> New Restricted Zone
            </p>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {error   && <p className="text-xs text-red-600   bg-red-100   border border-red-200   rounded-lg px-3 py-2 mb-3">{error}</p>}
          {success && <p className="text-xs text-green-700 bg-green-100 border border-green-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-1"><Check size={12}/>{success}</p>}

          {/* Mode toggle */}
          <div className="flex bg-white rounded-xl border border-red-200 p-1 mb-4 gap-1">
            {[
              { key: 'search', label: 'Search by Name', icon: Search },
              { key: 'map',    label: 'Pin on Map',     icon: Map    },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === m.key
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <m.icon size={13} /> {m.label}
              </button>
            ))}
          </div>

          {/* ── SEARCH MODE ── */}
          {mode === 'search' && (
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                Search Place / Area Name
              </label>
              <div className="relative">
                <input
                  className={inp + ' pr-8'}
                  placeholder="Type area name… e.g. Shivajinagar Pune"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                />
                {searching && (
                  <div className="absolute right-3 top-3">
                    <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Results dropdown */}
              {results.length > 0 && (
                <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => pickResult(r)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800 leading-tight">
                            {r.display_name.split(',')[0]}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                            {r.display_name.split(',').slice(1, 4).join(',')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {pin && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Check size={14} className="text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-green-700">Location selected</p>
                    <p className="text-xs text-green-600 mt-0.5">{pin.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MAP MODE ── */}
          {mode === 'map' && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2 font-medium flex items-center gap-1">
                <MapPin size={11} /> Click anywhere on the map to drop a pin
              </p>
              <div className="rounded-xl overflow-hidden border-2 border-red-200" style={{ height: 300 }}>
                <MapContainer
                  center={[18.6298, 73.7997]}  // Pimpri Chinchwad default
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <MapClickHandler onPick={pickFromMap} />
                  {pin && (
                    <>
                      <Marker position={[pin.lat, pin.lng]} icon={redIcon} />
                      <FlyTo lat={pin.lat} lng={pin.lng} />
                    </>
                  )}
                </MapContainer>
              </div>
              {pin && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Check size={14} className="text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-green-700">Pin dropped</p>
                    <p className="text-xs text-green-600 mt-0.5 leading-tight">{pin.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Area name override + Radius */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                Zone Label (shown on app)
              </label>
              <input
                className={inp}
                placeholder="e.g. Shivajinagar Area"
                value={areaName}
                onChange={e => setAreaName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                Radius (km)
              </label>
              <input
                className={inp}
                type="number"
                step="0.5"
                min="0.1"
                value={radiusKm}
                onChange={e => setRadiusKm(e.target.value)}
                placeholder="1"
              />
            </div>

            <div className="flex flex-col justify-end">
              <p className="text-xs text-gray-400 leading-relaxed">
                Criminal must stay <strong>{radiusKm || 1} km</strong> away from this point.
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleAdd}
            disabled={saving || !pin}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-colors"
          >
            {saving
              ? 'Saving...'
              : <><AlertTriangle size={14} /> Confirm Restricted Zone</>
            }
          </button>
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

        {/* ── LEFT ── */}
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

        {/* ── RIGHT ── */}
        <div className="lg:col-span-2">
          <Section title="Externment Details">
            <InfoRow label="Section"      value={criminal.externmentSection ? `Section ${criminal.externmentSection}` : null} />
            <InfoRow label="Period From"  value={fmtDate(criminal.periodFrom  || criminal.period_from)} />
            <InfoRow label="Period Till"  value={fmtDate(criminal.periodTill  || criminal.period_till)} />
            <InfoRow label="Home Address" value={criminal.address} />
            <InfoRow label="Residing At"  value={criminal.residenceAddress || criminal.residence_address} />
          </Section>

          {/* RESTRICTED AREAS */}
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
                {restrictedAreas.map(area => (
                  <div key={area.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">{area.area_name}</p>
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
                ))}
              </div>
            )}

            <AddAreaForm criminalId={id} onAdded={load} />
          </Section>

          {/* RECENT CHECK-INS */}
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
