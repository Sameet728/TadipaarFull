import axios from 'axios'

// Change this to your backend IP / domain
const BASE_URL = 'https://tadipaarbk-uxmc.onrender.com/api'

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
