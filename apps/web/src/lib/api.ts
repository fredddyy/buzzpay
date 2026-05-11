import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://buzzpay-production.up.railway.app/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("vendor_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export function setToken(token: string): void {
  localStorage.setItem("vendor_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("vendor_token");
}

export function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("vendor_token") : null;
}
