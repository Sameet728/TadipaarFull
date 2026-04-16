import axios from 'axios';
import Constants from 'expo-constants';

const runtimeHost =
  Constants.expoConfig?.hostUri
  || Constants.expoGoConfig?.debuggerHost
  || Constants.manifest2?.extra?.expoGo?.debuggerHost
  || '';

const devHost = runtimeHost.split(':')[0];
const envBaseUrl = process.env.EXPO_PUBLIC_API_URL;

const BASE_URL = envBaseUrl
  || (__DEV__ && devHost
    ? `http://${devHost}:5000/api`
    : 'http://127.0.0.1:5000/api');

console.log('[API BASE URL]', BASE_URL);

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