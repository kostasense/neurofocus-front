import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { clearTokens, getTokens, saveTokens } from "./token-storage";
const baseURL = process.env.EXPO_PUBLIC_API_URL;
if (!baseURL) console.warn("EXPO_PUBLIC_API_URL no está configurada");
export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
let refreshing: Promise<string | null> | null = null;
let authFailureHandler: () => void = () => {};
export function setAuthFailureHandler(handler: () => void) {
  authFailureHandler = handler;
}
apiClient.interceptors.request.use(async (config) => {
  const t = await getTokens();
  if (t?.accessToken) config.headers.Authorization = `Bearer ${t.accessToken}`;
  return config;
});
async function refreshAccessToken() {
  const tokens = await getTokens();
  if (!tokens?.refreshToken) return null;
  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, {
      refreshToken: tokens.refreshToken,
    });
    const payload = data?.data ?? data;
    const next = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken ?? tokens.refreshToken,
    };
    await saveTokens(next);
    return next.accessToken;
  } catch {
    await clearTokens();
    authFailureHandler();
    return null;
  }
}
apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/refresh")
    ) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);
export function apiData<T>(promise: Promise<{ data: any }>): Promise<T> {
  return promise.then((r) => r.data?.data ?? r.data);
}
