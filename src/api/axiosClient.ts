import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_BASE_URL ?? 'https://api.example.com',
  timeout: 10000,
});

export default api;
