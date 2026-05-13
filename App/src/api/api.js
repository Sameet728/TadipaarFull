import axios from 'axios';
import Constants from 'expo-constants';

// URLs provided
const RENDER_PROD_URL = 'https://tadipaarfull.onrender.com/api'; 
const RENDER_BK_URL = 'https://tadipaarbk-uxmc.onrender.com/api';

const runtimeHost = Constants.expoConfig?.hostUri || '';
const devHost = runtimeHost.split(':')[0];

// Logic: Use Environment Variable first, then Render Production, then Local fallback
const BASE_URL = process.env.EXPO_PUBLIC_API_URL 
  || RENDER_PROD_URL 
  || (__DEV__ && devHost ? `http://${devHost}:5000/api` : 'http://127.0.0.1:5000/api');

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

export default API;