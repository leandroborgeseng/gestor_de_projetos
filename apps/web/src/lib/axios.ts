import axios from "axios";
import { syncCompanyContext, getActiveCompanyId } from "../utils/company.js";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeCompanyId = getActiveCompanyId();
  if (activeCompanyId && config.headers) {
    config.headers["X-Company-Id"] = activeCompanyId;
  }

  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post("/api/auth/refresh", {
          refreshToken,
        });

        const { accessToken, activeCompanyId, companies } = response.data;
        localStorage.setItem("accessToken", accessToken);

        if (companies || activeCompanyId) {
          syncCompanyContext(companies, activeCompanyId);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        const companyId = getActiveCompanyId();
        if (companyId) {
          originalRequest.headers["X-Company-Id"] = companyId;
        }

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

