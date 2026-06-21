import axios from 'axios'

// Toggle this flag in the .env file
const IS_PROD = import.meta.env.VITE_IS_PRODUCTION === 'true'

const PROD_URL = import.meta.env.VITE_PROD_URL || 'https://tadipaarfull.onrender.com/api'
const DEV_URL = import.meta.env.VITE_DEV_URL || 'http://192.168.1.6:5000/api'

const BASE_URL = IS_PROD ? PROD_URL : DEV_URL

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
      const publicPaths = ['/login', '/download', '/capture']
      if (!publicPaths.some(p => window.location.pathname.startsWith(p))) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default adminAPI
