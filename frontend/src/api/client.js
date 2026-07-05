import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallback used only if the person hasn't configured a server yet in the app's
// Settings screen (Profile -> Server Settings). No source-code edit required to
// run this app anymore — everything is configurable from the UI.
export const DEFAULT_BASE_URL = 'http://192.168.1.63:5000';
const STORAGE_KEY = 'wardrobe_api_base_url';

let cachedBaseURL = null;

export async function getBaseURL() {
  if (cachedBaseURL) return cachedBaseURL;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  cachedBaseURL = stored || DEFAULT_BASE_URL;
  return cachedBaseURL;
}

export async function setBaseURL(url) {
  const trimmed = url.trim().replace(/\/+$/, '');
  cachedBaseURL = trimmed;
  await AsyncStorage.setItem(STORAGE_KEY, trimmed);
  return trimmed;
}

export async function testConnection(url) {
  const base = (url || (await getBaseURL())).trim().replace(/\/+$/, '');
  const resp = await axios.get(`${base}/api/health`, { timeout: 6000 });
  return resp.data;
}

const api = axios.create({ timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const base = await getBaseURL();
  config.baseURL = `${base}/api`;
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err?.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
