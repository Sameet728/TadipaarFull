import axios from 'axios';

// ✅ Your laptop IP (from ipconfig)
const BASE_URL = 'http://192.168.1.34:5000/api';

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔍 Debug logs (optional but useful)
API.interceptors.request.use(
  (config) => {
    console.log('[API]', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('[API ERROR]', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default API;