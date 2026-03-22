import React, { useState, useEffect } from 'react'
import { Filter, Download, X, RefreshCw } from 'lucide-react'
import adminAPI from '../api/api'
import { useAuth } from '../context/AuthContext'
import { today, daysAgo } from '../utils/helpers'

export default function Filters({ onFilter, onDownload, loading }) {
  const { auth } = useAuth()
  const role = auth?.role

  const [meta, setMeta] = useState({ zones: [], acpAreas: [], policeStations: [] })
  const [f, setF] = useState({
    zoneId: auth?.zoneId || '',
    acpAreaId: auth?.acpAreaId || '',
    policeStationId: auth?.policeStationId || '',
    section: '',
    status: '',
    dateFrom: daysAgo(30),
    dateTo: today(),
  })

  useEffect(() => {
    adminAPI.get('/criminal/meta/zones-stations').then(r => setMeta(r.data)).catch(() => {})
  }, [])

  const filteredACP = f.zoneId ? meta.acpAreas.filter(a => String(a.zone_id) === String(f.zoneId)) : meta.acpAreas
  const filteredPS  = f.acpAreaId ? meta.policeStations.filter(p => String(p.acp_area_id) === String(f.acpAreaId)) : meta.policeStations

  const set = (k, v) => setF(prev => {
    const next = { ...prev, [k]: v }
    if (k === 'zoneId')    { next.acpAreaId = ''; next.policeStationId = '' }
    if (k === 'acpAreaId') { next.policeStationId = '' }
    return next
  })

  const apply = () => {
    const params = {}
    if (f.zoneId)          params.zoneId          = f.zoneId
    if (f.acpAreaId)       params.acpAreaId        = f.acpAreaId
    if (f.policeStationId) params.policeStationId  = f.policeStationId
    if (f.section)         params.section          = f.section
    if (f.status)          params.status           = f.status
    if (f.dateFrom)        params.dateFrom         = f.dateFrom
    if (f.dateTo)          params.dateTo           = f.dateTo
    onFilter(params)
  }

  const reset = () => {
    const def = { zoneId: auth?.zoneId||'', acpAreaId: auth?.acpAreaId||'', policeStationId: auth?.policeStationId||'', section:'', status:'', dateFrom:daysAgo(30), dateTo:today() }
    setF(def)
    const params = {}
    if (auth?.zoneId)          params.zoneId         = auth.zoneId
    if (auth?.acpAreaId)       params.acpAreaId       = auth.acpAreaId
    if (auth?.policeStationId) params.policeStationId = auth.policeStationId
    onFilter(params)
  }

  const sel = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <Filter size={16} /> Filters
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border hover:bg-gray-50">
            <RefreshCw size={13}/> Reset
          </button>
          <button onClick={apply} className="flex items-center gap-1 text-xs bg-police-600 text-white px-3 py-1.5 rounded-lg hover:bg-police-700">
            <Filter size={13}/> Apply
          </button>
          {onDownload && (
            <button onClick={onDownload} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
              <Download size={13}/> CSV
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {/* Zone — hide if DCP/ACP/PS already fixed */}
        {(role === 'CP') && (
          <select value={f.zoneId} onChange={e => set('zoneId', e.target.value)} className={sel}>
            <option value="">All Zones</option>
            {meta.zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        )}
        {/* ACP */}
        {(role === 'CP' || role === 'DCP') && (
          <select value={f.acpAreaId} onChange={e => set('acpAreaId', e.target.value)} className={sel}>
            <option value="">All ACP Areas</option>
            {filteredACP.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {/* Police Station */}
        {role !== 'PS' && (
          <select value={f.policeStationId} onChange={e => set('policeStationId', e.target.value)} className={sel}>
            <option value="">All Stations</option>
            {filteredPS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {/* Section */}
        <select value={f.section} onChange={e => set('section', e.target.value)} className={sel}>
          <option value="">All Sections</option>
          <option value="55">Section 55</option>
          <option value="56">Section 56</option>
          <option value="57">Section 57</option>
        </select>
        {/* Status */}
        <select value={f.status} onChange={e => set('status', e.target.value)} className={sel}>
          <option value="">All Status</option>
          <option value="compliant">Compliant</option>
          <option value="non_compliant">Non Compliant</option>
        </select>
        {/* Date From */}
        <div>
          <label className="text-xs text-gray-400 block mb-0.5">From</label>
          <input type="date" value={f.dateFrom} onChange={e => set('dateFrom', e.target.value)} className={sel + ' w-full'} />
        </div>
        {/* Date To */}
        <div>
          <label className="text-xs text-gray-400 block mb-0.5">To</label>
          <input type="date" value={f.dateTo} onChange={e => set('dateTo', e.target.value)} className={sel + ' w-full'} />
        </div>
      </div>
    </div>
  )
}
