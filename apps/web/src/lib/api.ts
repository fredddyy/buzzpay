import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api-production-2eb0.up.railway.app/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== "undefined") {
      const refreshToken = localStorage.getItem("admin_refresh_token");

      if (!refreshToken) {
        localStorage.removeItem("admin_token");
        window.location.href = "/admin/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data;

        localStorage.setItem("admin_token", accessToken);
        localStorage.setItem("admin_refresh_token", newRefresh);

        // Retry all queued requests
        refreshQueue.forEach((cb) => cb(accessToken));
        refreshQueue = [];
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed — force login
        isRefreshing = false;
        refreshQueue = [];
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_refresh_token");
        window.location.href = "/admin/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("admin_token", accessToken);
  localStorage.setItem("admin_refresh_token", refreshToken);
}

export function setToken(token: string): void {
  localStorage.setItem("admin_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_refresh_token");
}

export function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
}
