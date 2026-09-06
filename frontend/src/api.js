import axios from "axios";

// Base URL:
// In production (Vercel): uses VITE_API_URL pointing to the Render backend service.
// In development: defaults to empty string so requests route through Vite's proxy.
const rawApiUrl = import.meta.env.VITE_API_URL || "";
const baseURL = rawApiUrl ? rawApiUrl.replace(/\/+$/, "") : "";

const api = axios.create({
  baseURL,
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
