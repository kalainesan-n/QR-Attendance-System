import axios from "axios";

// Base URL comes from the Vite environment variable.
// In development: http://localhost:5000
// In production:  set VITE_API_URL in your Vercel dashboard
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// Automatically attach the JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
