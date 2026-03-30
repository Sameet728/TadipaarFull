import React, { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import adminAPI from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function AddAdmin() {
  const { auth } = useAuth()
  const [form, setForm] = useState({
    name: '',
    login_id: '',
    password: '',
    role: 'DCP',
    zone_id: '',
    acp_area_id: '',
    police_station_id: '',
  })
  
  // States for the hierarchy options
  const [meta, setMeta] = useState({ zones: [], acpAreas: [], policeStations: [] })
  const [metaLoading, setMetaLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!auth) return null
  if (auth.role !== 'CP') return <Navigate to="/dashboard" replace />

  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        setMetaLoading(true)
        // Fetching from criminals list to derive hierarchy exactly like Filters.jsx
        const res = await adminAPI.get('/admin/criminals', { params: { limit: 1000 } })
        const criminals = res.data?.criminals || []

        const zoneMap = new Map()
        const acpMap = new Map()
        const psMap = new Map()

        criminals.forEach(c => {
          // Extract using the same keys as Filters.jsx
          const zName = c.zone
          const aName = c.acpArea || c.acp_area
          const pName = c.policeStation || c.police_station
          
          // We use the names as IDs for the dropdown logic to match Filters.jsx
          if (zName) {
            zoneMap.set(zName, { id: zName, name: zName })
          }
          if (zName && aName) {
            acpMap.set(aName, { id: aName, name: aName, zone_id: zName })
          }
          if (aName && pName) {
            psMap.set(pName, { id: pName, name: pName, acp_area_id: aName })
          }
        })

        setMeta({
          zones: Array.from(zoneMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
          acpAreas: Array.from(acpMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
          policeStations: Array.from(psMap.values()).sort((a, b) => a.name.localeCompare(b.name))
        })
      } catch (err) {
        console.error("META LOAD ERROR", err)
      } finally {
        setMetaLoading(false)
      }
    }
    loadHierarchy()
  }, [])

  // Filter ACP Areas based on selected Zone name
  const acpOptions = useMemo(() => {
    if (!form.zone_id) return []
    return meta.acpAreas.filter(a => a.zone_id === form.zone_id)
  }, [meta.acpAreas, form.zone_id])

  // Filter Police Stations based on selected ACP Area name
  const psOptions = useMemo(() => {
    if (!form.acp_area_id) return []
    return meta.policeStations.filter(ps => ps.acp_area_id === form.acp_area_id)
  }, [meta.policeStations, form.acp_area_id])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Cascading Resets
      if (name === 'role' || name === 'zone_id') {
        next.acp_area_id = ''
        next.police_station_id = ''
      }
      if (name === 'acp_area_id') {
        next.police_station_id = ''
      }
      return next
    })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name || !form.login_id || !form.password || !form.role) {
      setError('All fields are required.')
      return
    }

    if (!form.zone_id) {
      setError('Zone selection is required.')
      return
    }

    // Role-specific validation
    if (form.role === 'ACP' && !form.acp_area_id) {
      setError('ACP Area is required for ACP role.')
      return
    }
    if (form.role === 'PS' && (!form.acp_area_id || !form.police_station_id)) {
      setError('ACP Area and Police Station are required for PS role.')
      return
    }

    try {
      setLoading(true)
      const res = await adminAPI.post('/admin/add-admin', form)
      if (res.data?.success) {
        setSuccess('ADMIN ACCOUNT CREATED SUCCESSFULLY.')
        setForm({
          name: '', login_id: '', password: '', role: 'DCP',
          zone_id: '', acp_area_id: '', police_station_id: '',
        })
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'SYSTEM ERROR: UNABLE TO CREATE ADMIN.')
    } finally {
      setLoading(false)
    }
  }

  const selClass = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-police-blue bg-white disabled:opacity-50 transition-all"

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
          <div className="w-2 h-8 bg-police-blue rounded-full"></div>
          <h1 className="text-xl font-black text-police-navy tracking-widest uppercase">Create Admin Authority</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
            <input name="name" value={form.name} onChange={onChange} placeholder="Enter full name" className={selClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Official ID</label>
              <input name="login_id" value={form.login_id} onChange={onChange} placeholder="Login ID" className={selClass} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
              <input type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••••" className={selClass} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Administrative Designation</label>
            <select name="role" value={form.role} onChange={onChange} className={selClass}>
              <option value="DCP">DCP (ZONE HEAD)</option>
              <option value="ACP">ACP (DIVISION HEAD)</option>
              <option value="PS">PS (STATION HEAD)</option>
            </select>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assign Zone</label>
              <select name="zone_id" value={form.zone_id} onChange={onChange} className={selClass} disabled={metaLoading}>
                <option value="">{metaLoading ? 'LOADING JURISDICTIONS...' : 'SELECT ZONE'}</option>
                {meta.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>

            {(form.role === 'ACP' || form.role === 'PS') && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assign ACP Division</label>
                <select name="acp_area_id" value={form.acp_area_id} onChange={onChange} className={selClass} disabled={!form.zone_id}>
                  <option value="">SELECT ACP AREA</option>
                  {acpOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            {form.role === 'PS' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assign Police Station</label>
                <select name="police_station_id" value={form.police_station_id} onChange={onChange} className={selClass} disabled={!form.acp_area_id}>
                  <option value="">SELECT POLICE STATION</option>
                  {psOptions.map((ps) => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-police-blue text-white rounded-md px-4 py-3 text-xs font-black tracking-widest uppercase hover:bg-blue-800 transition-colors shadow-lg disabled:opacity-50 mt-4"
          >
            {loading ? 'Processing Registration...' : 'Authorize Admin Account'}
          </button>
        </form>

        {success && <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black tracking-widest uppercase rounded">{success}</div>}
        {error && <div className="mt-6 p-3 bg-red-50 border border-red-200 text-red-700 text-[10px] font-black tracking-widest uppercase rounded">{error}</div>}
      </div>
    </div>
  )
}