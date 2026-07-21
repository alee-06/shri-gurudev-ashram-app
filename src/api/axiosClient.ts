import axios from "axios";
import Constants from "expo-constants";
import { getAuthToken } from "../services/auth";

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) return process.env.EXPO_PUBLIC_API_BASE_URL;
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      return `http://${hostUri.split(':')[0]}:3000`;
    }
  }
  return "http://10.0.2.2:3000";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
