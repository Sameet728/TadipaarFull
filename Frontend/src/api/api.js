import axios from 'axios'

// Local-first for development, override with VITE_API_BASE_URL in production/deploy.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const adminAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request automatically
adminAPI.interceptors.request.use(cfg => {
  const token = localStorage.getItem('tadipaar_admin_token')
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`
  return cfg
})

// Auto-logout if token expires
adminAPI.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tadipaar_admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default adminAPI
