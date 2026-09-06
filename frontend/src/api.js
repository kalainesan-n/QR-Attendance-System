import axios from "axios";

// Base URL:
// In development: defaults to empty string so requests route through Vite's proxy.
// This allows both localhost and LAN devices (e.g. mobile phones) to seamlessly reach the backend.
// In production: set VITE_API_URL to your deployed backend URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
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
