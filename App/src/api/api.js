import axios from 'axios';
import Constants from 'expo-constants';

const IS_PROD = process.env.EXPO_PUBLIC_IS_PRODUCTION === 'true';

// URLs provided
const RENDER_PROD_URL = process.env.EXPO_PUBLIC_PROD_URL || 'https://tadipaarfull.onrender.com/api';

const runtimeHost = Constants.expoConfig?.hostUri || '';
const devHost = runtimeHost.split(':')[0] || '192.168.1.6';

// Logic: Use local network IP dynamically or fallback to env variable/192.168.1.6
const DEV_URL = process.env.EXPO_PUBLIC_DEV_URL || `http://${devHost}:5000/api`;

const BASE_URL = IS_PROD ? RENDER_PROD_URL : DEV_URL;

console.log('[API BASE URL]', BASE_URL);

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptors (keep these as you had them, they are great for debugging)
API.interceptors.request.use((config) => {
  console.log('[API REQUEST]', config.method?.toUpperCase(), config.url);
  return config;
});

// Retry logic for network timeouts and 5xx errors
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // Only retry once
    if (config && !config._retry && (!error.response || error.response.status >= 500)) {
      config._retry = true;
      console.log(`[API RETRY] Retrying ${config.url}...`);
      return API(config);
    }
    return Promise.reject(error);
  }
);

export default API;