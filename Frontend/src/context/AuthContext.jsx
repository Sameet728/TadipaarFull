import React, { createContext, useContext, useState, useEffect } from 'react'
import adminAPI from '../api/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [auth,    setAuth]    = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('tadipaar_admin_token')
    if (stored) {
      // Verify token is still valid
      adminAPI.get('/admin/auth/me', {
        headers: { Authorization: `Bearer ${stored}` }
      })
        .then(res => {
          if (res.data.success) {
            setAuth({ ...res.data.admin, token: stored })
          } else {
            localStorage.removeItem('tadipaar_admin_token')
          }
        })
        .catch(() => localStorage.removeItem('tadipaar_admin_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (adminData, token) => {
    localStorage.setItem('tadipaar_admin_token', token)
    setAuth({ ...adminData, token })
  }

  const logout = () => {
    localStorage.removeItem('tadipaar_admin_token')
    setAuth(null)
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)