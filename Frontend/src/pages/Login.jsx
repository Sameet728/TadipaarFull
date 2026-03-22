import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import adminAPI from '../api/api'
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react'

const SEED = [
  { role: 'CP',  username: 'cp_admin',   label: 'Commissioner of Police', color: 'border-yellow-400 bg-yellow-400/10 text-yellow-200' },
  { role: 'DCP', username: 'dcp_zone1',  label: 'DCP — Zone 1',           color: 'border-blue-400   bg-blue-400/10   text-blue-200'   },
  { role: 'ACP', username: 'acp_pimpri', label: 'ACP — Pimpri',           color: 'border-green-400  bg-green-400/10  text-green-200'  },
  { role: 'PS',  username: 'ps_pimpri',  label: 'PS — Pimpri',            color: 'border-slate-400  bg-slate-400/10  text-slate-200'  },
]

const ROLE_BADGE = {
  CP:  'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  DCP: 'bg-blue-500/20   text-blue-300   border border-blue-500/40',
  ACP: 'bg-green-500/20  text-green-300  border border-green-500/40',
  PS:  'bg-slate-500/20  text-slate-300  border border-slate-500/40',
}

export default function Login() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const [username,   setUsername]   = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0F172A 100%)',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur mb-4 text-4xl">
            🚔
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            PROJECT TADIPAAR
          </h1>
          <p className="text-blue-300 text-sm font-semibold tracking-widest mt-1 uppercase">
            Maharashtra Police
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-16 bg-white/20" />
            <Shield size={12} className="text-white/40" />
            <div className="h-px w-16 bg-white/20" />
          </div>
          <p className="text-white/40 text-xs mt-2 tracking-wider uppercase">
            Externment Monitoring System — Admin Panel
          </p>
        </div>

        {/* ── Login card ── */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-7 shadow-2xl">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-xl px-4 py-3 mb-6">
              <span className="text-base">⚠️</span> {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
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
                spellCheck={false}
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your password"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Sign In button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm tracking-wide transition-all shadow-lg shadow-blue-900/50 mt-2"
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
                <><LogIn size={16} /> SIGN IN</>
              )}
            </button>
          </div>
        </div>

        {/* ── Quick fill accounts ── */}
        <div className="mt-5">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-widest text-center mb-3">
            Quick Access — Test Accounts (admin123)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SEED.map(a => (
              <button
                key={a.username}
                onClick={() => { setUsername(a.username); setPassword('admin123') }}
                className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium hover:opacity-80 transition-opacity ${a.color}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${ROLE_BADGE[a.role]}`}>
                    {a.role}
                  </span>
                </div>
                <div className="font-semibold leading-tight">{a.label}</div>
                <div className="font-mono text-white/40 text-xs mt-0.5">{a.username}</div>
              </button>
            ))}
          </div>
          <p className="text-white/20 text-xs text-center mt-3">
            Tap a card to autofill · then press Sign In
          </p>
        </div>

      </div>
    </div>
  )
}
