import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import adminAPI from '../api/api'
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react'

const SEED = [
  { role: 'CP',  username: 'cp_admin',   label: 'Commissioner of Police', color: 'border-yellow-300 bg-yellow-50 text-yellow-800' },
  { role: 'DCP', username: 'dcp_zone1',  label: 'DCP — Zone 1',           color: 'border-blue-300   bg-blue-50   text-blue-800'   },
  { role: 'ACP', username: 'acp_pimpri', label: 'ACP — Pimpri',           color: 'border-green-300  bg-green-50  text-green-800'  },
  { role: 'PS',  username: 'ps_pimpri',  label: 'PS — Pimpri',            color: 'border-gray-300   bg-gray-50   text-gray-700'   },
]

const ROLE_BADGE = {
  CP:  'bg-yellow-100 text-yellow-700 border border-yellow-300',
  DCP: 'bg-blue-100   text-blue-700   border border-blue-300',
  ACP: 'bg-green-100  text-green-700  border border-green-300',
  PS:  'bg-gray-100   text-gray-600   border border-gray-300',
}

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
      setError(e?.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* ── Official Header ── */}
        <div className="text-center mb-8">
          {/* Emblem placeholder — replace src with actual Maharashtra Police emblem */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1E3A8A] mb-4 shadow-lg">
            <Shield size={36} className="text-white" />
          </div>

          <h1 className="text-xl font-black text-[#1E3A8A] uppercase tracking-widest leading-tight">
            Maharashtra Police
          </h1>
          <p className="text-sm font-bold text-gray-500 tracking-widest uppercase mt-1">
            Pimpri Chinchwad
          </p>
          <div className="mt-3 mx-auto w-24 h-0.5 bg-[#1E3A8A] rounded" />
          <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase mt-2">
            Externment Monitoring System
          </p>
        </div>

        {/* ── Login card ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">

          {/* Card top accent bar */}
          <div className="h-1.5 w-full bg-[#1E3A8A]" />

          <div className="p-8">
            <h2 className="text-base font-bold text-gray-700 mb-6 text-center tracking-wide uppercase">
              Official Sign In
            </h2>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
                <span className="font-bold">!</span> {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="Enter your password"
                    className="w-full border border-gray-300 bg-gray-50 text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Sign In */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1E3A8A] hover:bg-[#163172] disabled:opacity-60 text-white font-bold py-3.5 rounded-lg text-sm tracking-widest uppercase transition-all shadow-md mt-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  <><LogIn size={15} /> Sign In</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Test accounts ── */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-4">
            Test Accounts — Password: admin123
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SEED.map(a => (
              <button
                key={a.username}
                onClick={() => { setUsername(a.username); setPassword('admin123') }}
                className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium hover:shadow-sm transition-all ${a.color}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs font-black px-1.5 py-0.5 rounded ${ROLE_BADGE[a.role]}`}>
                    {a.role}
                  </span>
                </div>
                <div className="font-semibold leading-tight text-xs">{a.label}</div>
                <div className="font-mono text-gray-400 text-xs mt-0.5">{a.username}</div>
              </button>
            ))}
          </div>
          <p className="text-gray-300 text-xs text-center mt-3">
            Tap a card to autofill, then press Sign In
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-5 tracking-wide">
          PIMPRI CHINCHWAD POLICE COMMISSIONERATE
        </p>

      </div>
    </div>
  )
}
