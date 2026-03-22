import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import adminAPI from '../api/api'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async () => {
    if (!username.trim()) { setError('Enter your username'); return }
    if (!password.trim()) { setError('Enter your password'); return }

    setLoading(true)
    setError('')

    try {
      const res = await adminAPI.post('/admin/auth/login', {
        username: username.trim(),
        password,
      })

      if (res.data.success) {
        login(res.data.admin, res.data.token)
        navigate('/dashboard')
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Login failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  const roleColors = {
    CP:  'bg-yellow-100 text-yellow-800 border-yellow-300',
    DCP: 'bg-blue-100   text-blue-800   border-blue-300',
    ACP: 'bg-green-100  text-green-800  border-green-300',
    PS:  'bg-gray-100   text-gray-800   border-gray-300',
  }

  const seedAccounts = [
    { role:'CP',  username:'cp_admin',   label:'CP Pimpri Chinchwad' },
    { role:'DCP', username:'dcp_zone1',  label:'DCP Zone 1' },
    { role:'ACP', username:'acp_pimpri', label:'ACP Pimpri' },
    { role:'PS',  username:'ps_pimpri',  label:'PS Pimpri' },
  ]

  return (
    <div className="min-h-screen bg-police-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-5xl">🚔</span>
            <h1 className="text-2xl font-bold text-gray-800 mt-3">Project Tadipaar</h1>
            <p className="text-gray-400 text-sm mt-1">Maharashtra Police — Admin Panel</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="e.g. cp_admin"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-police-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-police-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-police-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-police-700 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </button>
          </div>
        </div>

        {/* Seed account hints */}
        <div className="mt-5 bg-white/10 rounded-xl p-4 backdrop-blur">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
            Default Test Accounts (password: admin123)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {seedAccounts.map(a => (
              <button
                key={a.username}
                onClick={() => { setUsername(a.username); setPassword('admin123') }}
                className={`text-left px-3 py-2 rounded-lg border text-xs font-medium hover:opacity-80 transition-opacity ${roleColors[a.role]}`}
              >
                <span className="font-bold">[{a.role}]</span> {a.label}
                <div className="text-gray-500 font-mono mt-0.5">{a.username}</div>
              </button>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-3 text-center">
            Click any card to autofill → then click Sign In
          </p>
        </div>
      </div>
    </div>
  )
}