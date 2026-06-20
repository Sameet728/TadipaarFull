import React, { useState, useMemo } from 'react'
import { Filter, Download, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { today, daysAgo } from '../utils/helpers'

export default function Filters({ onFilter, onDownload, loading, criminals = [] }) {
  const { auth } = useAuth()
  const role = String(auth?.role || '').toUpperCase()

  const [f, setF] = useState({
    zone: '',
    acpArea: '',
    policeStation: '',
    section: '',
    status: '',
    dateFrom: daysAgo(30),
    dateTo: today(),
  })

  // Derive unique zone names directly from criminals list
  const zoneOptions = useMemo(() => {
    const seen = new Set()
    for (const c of criminals) {
      if (c.zone) seen.add(c.zone)
    }
    return Array.from(seen).sort()
  }, [criminals])

  // ACP options filtered by selected zone
  const acpOptions = useMemo(() => {
    const seen = new Set()
    for (const c of criminals) {
      if (!c.acpArea) continue
      if (f.zone && c.zone !== f.zone) continue
      seen.add(c.acpArea)
    }
    return Array.from(seen).sort()
  }, [criminals, f.zone])

  // PS options filtered by selected ACP
  const psOptions = useMemo(() => {
    const seen = new Set()
    for (const c of criminals) {
      if (!c.policeStation) continue
      if (f.zone && c.zone !== f.zone) continue
      if (f.acpArea && c.acpArea !== f.acpArea) continue
      seen.add(c.policeStation)
    }
    return Array.from(seen).sort()
  }, [criminals, f.zone, f.acpArea])

  const set = (k, v) => setF(prev => {
    const next = { ...prev, [k]: v }
    if (k === 'zone')    { next.acpArea = ''; next.policeStation = '' }
    if (k === 'acpArea') { next.policeStation = '' }
    return next
  })

  const apply = () => {
    const params = {}
    if (f.zone)          params.zone          = f.zone
    if (f.acpArea)       params.acpArea        = f.acpArea
    if (f.policeStation) params.policeStation  = f.policeStation
    if (f.section)       params.section        = f.section
    if (f.status)        params.status         = f.status
    if (f.dateFrom)      params.dateFrom       = f.dateFrom
    if (f.dateTo)        params.dateTo         = f.dateTo
    onFilter(params)
  }

  const reset = () => {
    setF({ zone:'', acpArea:'', policeStation:'', section:'', status:'', dateFrom:daysAgo(30), dateTo:today() })
    onFilter({})
  }

  const showZone = role === 'CP'
  const showACP  = role === 'CP' || role === 'DCP'
  const showPS   = role === 'CP' || role === 'DCP' || role === 'ACP'

  const sel = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <Filter size={16} /> Filters
          {loading && <span className="text-xs text-gray-400 ml-1">(loading…)</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border hover:bg-gray-50">
            <RefreshCw size={13}/> Reset
          </button>
          <button onClick={apply} disabled={loading} className="flex items-center gap-1 text-xs bg-police-600 text-white px-3 py-1.5 rounded-lg hover:bg-police-700 disabled:opacity-60">
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

        {showZone && (
          <select value={f.zone} onChange={e => set('zone', e.target.value)} className={sel}>
            <option value="">All Zones</option>
            {zoneOptions.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        )}

        {showACP && (
          <select value={f.acpArea} onChange={e => set('acpArea', e.target.value)} className={sel}>
            <option value="">All ACP Areas</option>
            {acpOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {showPS && (
          <select value={f.policeStation} onChange={e => set('policeStation', e.target.value)} className={sel}>
            <option value="">All Stations</option>
            {psOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}

        <select value={f.section} onChange={e => set('section', e.target.value)} className={sel}>
          <option value="">All Sections</option>
          <option value="55">Section 55</option>
          <option value="56">Section 56</option>
          <option value="57">Section 57</option>
        </select>

        <select value={f.status} onChange={e => set('status', e.target.value)} className={sel}>
          <option value="">All Status</option>
          <option value="compliant">Compliant</option>
          <option value="non_compliant">Non Compliant</option>
        </select>

        <div>
          <label className="text-xs text-gray-400 block mb-0.5">From</label>
          <input type="date" value={f.dateFrom} onChange={e => set('dateFrom', e.target.value)} className={sel + ' w-full'} />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-0.5">To</label>
          <input type="date" value={f.dateTo} onChange={e => set('dateTo', e.target.value)} className={sel + ' w-full'} />
        </div>

      </div>
    </div>
  )
}