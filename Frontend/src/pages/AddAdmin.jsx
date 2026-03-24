import React, { useState } from 'react'
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
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!auth) return null
  if (auth.role !== 'CP') return <Navigate to="/dashboard" replace />

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name || !form.login_id || !form.password || !form.role) {
      setError('All fields are required.')
      return
    }

    try {
      setLoading(true)
      const res = await adminAPI.post('/admin/add-admin', form)
      if (res.data?.success) {
        setSuccess('Admin created successfully.')
        setForm({ name: '', login_id: '', password: '', role: 'DCP' })
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
