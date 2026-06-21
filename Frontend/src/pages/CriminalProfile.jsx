import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Trash2,
  AlertTriangle, Loader2, X
} from 'lucide-react'
import {
  MapContainer, TileLayer, Marker, Tooltip, Polygon, Circle, useMap
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import adminAPI from '../api/api'
import { fmtDate, fmtDateTime } from '../utils/helpers'

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ══════════════════════════════════════════════════════════
//  Pune Boundary Map Component
// ══════════════════════════════════════════════════════════

const AutoFitBounds = ({ areas, divisions }) => {
  const map = useMap();
  useEffect(() => {
    let bounds = new L.LatLngBounds();
    let hasPoints = false;
    areas.filter(a => a.area_type === 'polygon').forEach(area => {
      const div = divisions.find(d => d.name === area.area_name);
      if (div && div.polygon) {
        div.polygon.forEach(coord => {
          bounds.extend([coord.lat, coord.lng]);
          hasPoints = true;
        });
      }
    });
    if (hasPoints) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [areas, divisions, map]);
  return null;
}

const PuneBoundaryMap = ({ areas = [], divisions = [], className = "w-full h-96 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm mb-4" }) => {
  const [boundaryCoords, setBoundaryCoords] = useState([])
  const [boundaryLoading, setBoundaryLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [policeStations, setPoliceStations] = useState([])
  const puneCenter = { lat: 18.5204, lng: 73.8567 }

  useEffect(() => {
    let currentController = null

    // Fetch zones and police stations from database
    const fetchBoundaryData = async () => {
      if (currentController) currentController.abort()
      const controller = new AbortController()
      currentController = controller

      try {
        console.log('Fetching zones and police stations...')
        const response = await adminAPI.get('/admin/geofence-presets', { signal: controller.signal })
        const data = response.data
        
        console.log('Geofence data:', data)
        
        const zonesData = data.zones || []
        const stationsData = data.policeStations || data.police_stations || []
        
        setZones(zonesData)
        setPoliceStations(stationsData)
        
        // Collect all coordinates from zones and police stations
        const allCoords = []
        
        // Add zone coordinates
        zonesData.forEach(zone => {
          if (zone.geofence_lat && zone.geofence_lng) {
            allCoords.push({
              lat: parseFloat(zone.geofence_lat),
              lng: parseFloat(zone.geofence_lng),
              radius: parseFloat(zone.geofence_radius_km || 8)
            })
          }
        })
        
        // Add police station coordinates
        stationsData.forEach(station => {
          if (station.geofence_lat && station.geofence_lng) {
            allCoords.push({
              lat: parseFloat(station.geofence_lat),
              lng: parseFloat(station.geofence_lng),
              radius: parseFloat(station.geofence_radius_km || 1.5)
            })
          }
        })
        
        console.log('All coordinates:', allCoords)
        
        if (allCoords.length > 0) {
          // Calculate boundary that encompasses all zones and stations
          const boundary = calculateBoundary(allCoords)
          setBoundaryCoords(boundary)
          console.log('Calculated boundary:', boundary)
        } else {
          console.warn('No coordinates found, using fallback')
          // Fallback to default Pune boundary
          setBoundaryCoords(getDefaultPuneBoundary())
        }
      } catch (error) {
        if (adminAPI.isCancel(error) || error.name === 'CanceledError') return
        console.error('Failed to fetch boundary data:', error)
        // Use fallback boundary
        setBoundaryCoords(getDefaultPuneBoundary())
      } finally {
        setBoundaryLoading(false)
      }
    }

    fetchBoundaryData()
    return () => {
      if (currentController) currentController.abort()
    }
  }, [])

  // Calculate boundary polygon from all zone/station coordinates
  const calculateBoundary = (coords) => {
    if (coords.length === 0) return getDefaultPuneBoundary()
    
    // Find extreme points with radius buffer
    let minLat = Infinity, maxLat = -Infinity
    let minLng = Infinity, maxLng = -Infinity
    
    coords.forEach(coord => {
      // Convert radius km to approximate degrees (1 degree ≈ 111 km)
      const latBuffer = coord.radius / 111
      const lngBuffer = coord.radius / (111 * Math.cos(coord.lat * Math.PI / 180))
      
      minLat = Math.min(minLat, coord.lat - latBuffer)
      maxLat = Math.max(maxLat, coord.lat + latBuffer)
      minLng = Math.min(minLng, coord.lng - lngBuffer)
      maxLng = Math.max(maxLng, coord.lng + lngBuffer)
    })
    
    // Add 10% padding
    const latPadding = (maxLat - minLat) * 0.1
    const lngPadding = (maxLng - minLng) * 0.1
    
    minLat -= latPadding
    maxLat += latPadding
    minLng -= lngPadding
    maxLng += lngPadding
    
    // Create rectangular boundary (can be enhanced to convex hull)
    return [
      [maxLat, minLng], // Top-left
      [maxLat, maxLng], // Top-right
      [maxLat, maxLng], // Top-right (duplicate for smooth corner)
      [minLat, maxLng], // Bottom-right
      [minLat, maxLng], // Bottom-right (duplicate)
      [minLat, minLng], // Bottom-left
      [minLat, minLng], // Bottom-left (duplicate)
      [maxLat, minLng], // Close polygon
    ]
  }

  // Fallback boundary
  const getDefaultPuneBoundary = () => [
    [18.7200, 73.7400],
    [18.7500, 73.7800],
    [18.7800, 73.8200],
    [18.7600, 73.8800],
    [18.7200, 73.9200],
    [18.6800, 73.9600],
    [18.6400, 73.9800],
    [18.6000, 73.9900],
    [18.5600, 74.0000],
    [18.5200, 73.9900],
    [18.4800, 73.9700],
    [18.4400, 73.9400],
    [18.4200, 73.9000],
    [18.4000, 73.8600],
    [18.4100, 73.8200],
    [18.4300, 73.7800],
    [18.4600, 73.7500],
    [18.5000, 73.7200],
    [18.5400, 73.7000],
    [18.5800, 73.6900],
    [18.6200, 73.7000],
    [18.6600, 73.7100],
    [18.7000, 73.7200],
    [18.7200, 73.7400],
  ]

  const puneBoundaryStyle = {
    color: '#DC2626',
    weight: 4,
    opacity: 0.9,
    fillColor: '#EF4444',
    fillOpacity: 0.15,
  }

  const zoneCircleStyle = {
    color: '#DC2626',
    weight: 2,
    opacity: 0.6,
    fillColor: '#EF4444',
    fillOpacity: 0.1,
    dashArray: '5 5',
  }

  const divisionPolygonStyle = {
    color: '#DC2626',
    weight: 3,
    opacity: 0.9,
    fillColor: '#EF4444',
    fillOpacity: 0.2,
  }

  const stationCircleStyle = {
    color: '#64748B',
    weight: 1,
    opacity: 0.4,
    fillColor: '#64748B',
    fillOpacity: 0.02,
    dashArray: '3 3',
  }

  console.log('PuneBoundaryMap - boundaryCoords:', boundaryCoords)

  if (boundaryLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-50`}>
        <div className="text-slate-400 text-sm">Loading boundary data...</div>
      </div>
    )
  }

  return (
    <div className={className}>
      <MapContainer
        center={[puneCenter.lat, puneCenter.lng]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFitBounds areas={areas} divisions={divisions} />
        
        {/* Pune City Boundary Polygon (only if explicitly assigned) */}
        {areas.some(a => a.area_name === 'Pune City Boundary' || a.area_name === 'Pune City Confinement') && boundaryCoords.length > 0 && (
          <Polygon
            positions={boundaryCoords}
            pathOptions={puneBoundaryStyle}
          />
        )}

        {/* Division Polygons */}
        {areas.filter(a => a.area_type === 'polygon').map((area, idx) => {
          const div = divisions.find(d => d.name === area.area_name);
          if (!div || !div.polygon) return null;
          return (
            <Polygon
              key={`div-${idx}`}
              positions={div.polygon}
              pathOptions={divisionPolygonStyle}
            >
              <Tooltip>{div.name} Division</Tooltip>
            </Polygon>
          );
        })}

        {/* Zone circles (optional - shown as reference) */}
        {zones.map((zone, idx) => (
          zone.geofence_lat && zone.geofence_lng && (
            <Circle
              key={`zone-${idx}`}
              center={[parseFloat(zone.geofence_lat), parseFloat(zone.geofence_lng)]}
              radius={parseFloat(zone.geofence_radius_km || 8) * 1000}
              pathOptions={zoneCircleStyle}
            />
          )
        ))}

        {/* Police station circles (optional - very subtle) */}
        {policeStations.map((station, idx) => (
          station.geofence_lat && station.geofence_lng && (
            <Circle
              key={`station-${idx}`}
              center={[parseFloat(station.geofence_lat), parseFloat(station.geofence_lng)]}
              radius={parseFloat(station.geofence_radius_km || 1.5) * 1000}
              pathOptions={stationCircleStyle}
            />
          )
        ))}


      </MapContainer>
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
  const [error,     setError]   = useState(null)
  const [deleting,  setDeleting] = useState(null)
  const [availableDivisions, setAvailableDivisions] = useState([])
  const [addingDiv, setAddingDiv] = useState(false)
  const [selectedDiv, setSelectedDiv] = useState('')
  const [fullScreenArea, setFullScreenArea] = useState(null)

  const abortControllerRef = React.useRef(null)

  const load = useCallback((showLoader = true) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    if (showLoader) setLoading(true)
    Promise.all([
      adminAPI.get(`/admin/criminals/${id}`, { signal: controller.signal }),
      adminAPI.get('/admin/divisions', { signal: controller.signal }).catch(() => ({ data: { divisions: [] } }))
    ])
      .then(([r, divR]) => {
        setData(r.data)
        const divs = divR.data?.divisions || [];
        setAvailableDivisions(divs)
        if (divs.length === 1) {
          setSelectedDiv(divs[0].name)
        }
        if (showLoader) setLoading(false)
      })
      .catch((e) => {
        if (adminAPI.isCancel(e) || e.name === 'CanceledError') return
        console.error(e)
        if (showLoader) setLoading(false)
      })
  }, [id])

  useEffect(() => { 
    load(true) 
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [load])

  const deleteArea = async (areaId) => {
    if (!window.confirm('Remove this restricted area?')) return
    setDeleting(areaId)
    try {
      await adminAPI.delete(`/admin/areas/${areaId}`)
      load(false)
    } catch (e) {
      alert(e?.response?.data?.message || 'Delete failed.')
    } finally { setDeleting(null) }
  }

  const addDivision = async () => {
    if (!selectedDiv) return;
    setAddingDiv(true);
    try {
      await adminAPI.post('/admin/areas', {
        criminalId: id,
        divisionName: selectedDiv
      });
      setSelectedDiv('');
      load(false);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to add division.');
    } finally {
      setAddingDiv(false);
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
      <Loader2 size={28} className="animate-spin text-[#1E3A8A]" />
      <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Loading Profile...</span>
    </div>
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
            {criminal.passwordVisible && <InfoRow label="Password" value={criminal.passwordVisible} />}
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
            title={`Restricted Zone (Externment)`}
            badge={
              <span className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                Geo-fenced
              </span>
            }
          >
            {restrictedAreas.length > 0 && <PuneBoundaryMap areas={restrictedAreas} divisions={availableDivisions} />}

            {restrictedAreas.length === 0 ? (
              <div className="text-center py-4">
                <AlertTriangle size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-medium">No restricted zone defined.</p>
                <p className="text-gray-300 text-xs mt-1">
                  Restricted zone is set during registration via "Assign Jurisdiction" option.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-800 font-semibold mb-1">
                    📍 Territorial Restriction (Tadipaar)
                  </p>
                  <p className="text-xs text-red-600">
                    The externee is legally banned from the assigned boundaries shown on the map at all times. Entering this zone will trigger a violation.
                  </p>
                </div>
                <div className="space-y-2">
                  {restrictedAreas.map((area) => {
                    const isRestricted = area.is_confinement === false
                    if (!isRestricted) return null
                    return (
                      <div key={area.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <div className="flex items-start gap-3">
                          <MapPin size={16} className="text-red-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-gray-800">{area.area_name}</p>
                              <Chip label="Restricted Zone" color="red" />
                            </div>
                            {parseFloat(area.latitude) !== 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Center: {parseFloat(area.latitude).toFixed(5)}, {parseFloat(area.longitude).toFixed(5)}
                              </p>
                            )}
                            <p className="text-xs text-red-600 font-semibold mt-1">
                              ⛔ BANNED: Must stay outside {area.area_type === 'polygon' ? `${area.area_name} division` : 'Pune city boundary'}
                            </p>
                            {parseFloat(area.latitude) !== 0 ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${area.latitude},${area.longitude}`}
                                target="_blank" rel="noreferrer"
                                className="text-xs text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
                              >
                                <MapPin size={9} /> View on Google Maps
                              </a>
                            ) : (
                              <button
                                onClick={() => setFullScreenArea(area)}
                                className="text-xs text-blue-400 hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <MapPin size={9} /> View Interactive Map
                              </button>
                            )}
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
              </>
            )}

            {availableDivisions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <select 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedDiv}
                  onChange={(e) => setSelectedDiv(e.target.value)}
                  disabled={addingDiv}
                >
                  <option value="">Select Jurisdiction to Assign...</option>
                  {availableDivisions.map(div => (
                    <option key={div.id} value={div.name}>{div.name}</option>
                  ))}
                </select>
                <button 
                  onClick={addDivision}
                  disabled={!selectedDiv || addingDiv}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {addingDiv ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
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

      {/* FULL SCREEN MAP MODAL */}
      {fullScreenArea && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
          <div className="bg-[#1E3A8A] px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <MapPin className="text-white" size={24} />
              <div>
                <h2 className="text-white font-black tracking-widest uppercase text-sm">{fullScreenArea.area_name} JURISDICTION</h2>
                <p className="text-blue-200 text-[10px] font-bold tracking-widest uppercase">Interactive Restricted Zone Map</p>
              </div>
            </div>
            <button 
              onClick={() => setFullScreenArea(null)}
              className="text-white hover:bg-red-500 hover:text-white p-2 rounded-lg transition-colors group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
          <div className="flex-1 bg-slate-50 relative">
            <PuneBoundaryMap 
              areas={[fullScreenArea]} 
              divisions={availableDivisions}
              className="absolute inset-0 w-full h-full" 
            />
          </div>
        </div>
      )}

    </div>
  )
}
