import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import adminAPI from '../api/api'
import { useAuth } from '../context/AuthContext'

const dedupeById = (items = []) =>
  Array.from(new Map(items.map((i) => [String(i.id), i])).values())

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
  const [zones, setZones] = useState([])
  const [acpAreas, setAcpAreas] = useState([])
  const [policeStations, setPoliceStations] = useState([])
  const hierarchyLoadedRef = useRef(false)
  const [metaLoading, setMetaLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!auth) return null
  if (auth.role !== 'CP') return <Navigate to="/dashboard" replace />

  useEffect(() => {
    if (hierarchyLoadedRef.current) return
    hierarchyLoadedRef.current = true

    const loadHierarchy = async () => {
      try {
        setMetaLoading(true)
        const res = await adminAPI.get('/admin/hierarchy')
        const data = res.data || {}
        setZones(dedupeById(data.zones || []))
        setAcpAreas(dedupeById(data.acp_areas || []))
        setPoliceStations(dedupeById(data.police_stations || []))
      } catch {
        setZones([])
        setAcpAreas([])
        setPoliceStations([])
      } finally {
        setMetaLoading(false)
      }
    }
    loadHierarchy()
  }, [])

  const acpOptions = useMemo(
    () =>
      dedupeById(
        (acpAreas || []).filter(
          (a) => String(a.zone_id ?? a.zoneId) === String(form.zone_id)
        )
      ),
    [acpAreas, form.zone_id]
  )

  const psOptions = useMemo(
    () =>
      dedupeById(
        (policeStations || []).filter(
          (ps) => String(ps.acp_area_id ?? ps.acpAreaId) === String(form.acp_area_id)
        )
      ),
    [policeStations, form.acp_area_id]
  )

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'role') {
        next.zone_id = ''
        next.acp_area_id = ''
        next.police_station_id = ''
      }
      if (name === 'zone_id') {
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
      setError('Zone is required.')
      return
    }
    if (form.role === 'ACP' && !form.acp_area_id) {
      setError('ACP Area is required for ACP role.')
      return
    }
    if (form.role === 'PS' && (!form.acp_area_id || !form.police_station_id)) {
      setError('ACP Area and Police Station are required for PS role.')
      return
    }

    const payload = {
      name: form.name,
      login_id: form.login_id,
      password: form.password,
      role: form.role,
      zone_id: parseInt(form.zone_id, 10),
    }

    if (form.role === 'ACP' || form.role === 'PS') {
      payload.acp_area_id = parseInt(form.acp_area_id, 10)
    }
    if (form.role === 'PS') {
      payload.police_station_id = parseInt(form.police_station_id, 10)
    }

    try {
      setLoading(true)
      const res = await adminAPI.post('/admin/add-admin', payload)
      if (res.data?.success) {
        setSuccess('Admin created successfully.')
        setForm({
          name: '',
          login_id: '',
          password: '',
          role: 'DCP',
          zone_id: '',
          acp_area_id: '',
          police_station_id: '',
        })
      } else {
        setError('Unable to create admin.')
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create admin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h1 className="text-lg font-black text-police-navy tracking-wide mb-6 uppercase">Add Admin</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Name"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
          />

          <input
            name="login_id"
            value={form.login_id}
            onChange={onChange}
            placeholder="Login ID"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
          />

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            placeholder="Password"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
          />

          <select
            name="role"
            value={form.role}
            onChange={onChange}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
          >
            <option value="DCP">DCP</option>
            <option value="ACP">ACP</option>
            <option value="PS">PS</option>
          </select>

          <select
            name="zone_id"
            value={form.zone_id}
            onChange={onChange}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
            disabled={metaLoading}
          >
            <option value="">Select Zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>

          {(form.role === 'ACP' || form.role === 'PS') && (
            <select
              name="acp_area_id"
              value={form.acp_area_id}
              onChange={onChange}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
              disabled={!form.zone_id || metaLoading}
            >
              <option value="">Select ACP Area</option>
              {acpOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          {form.role === 'PS' && (
            <select
              name="police_station_id"
              value={form.police_station_id}
              onChange={onChange}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-police-blue"
              disabled={!form.acp_area_id || metaLoading}
            >
              <option value="">Select Police Station</option>
              {psOptions.map((ps) => (
                <option key={ps.id} value={ps.id}>{ps.name}</option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-police-blue text-white rounded-md px-4 py-2 text-sm font-bold tracking-wide disabled:opacity-60"
          >
            {loading ? 'CREATING...' : 'CREATE ADMIN'}
          </button>
        </form>

        {success && <p className="text-green-700 text-sm mt-4">{success}</p>}
        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      </div>
    </div>
  )
}
