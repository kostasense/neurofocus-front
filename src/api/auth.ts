import { apiClient, apiData } from "@/lib/api-client";
import type { LoginResult } from "@/types/api";
export const authApi = {
  login: (correo: string, contrasena: string) =>
    apiData<LoginResult>(apiClient.post("/auth/login", { correo, contrasena })),
  refresh: (refreshToken: string) =>
    apiData(apiClient.post("/auth/refresh", { refreshToken })),
  profile: () => apiData(apiClient.get("/auth/profile")),
  validate: () => apiData(apiClient.post("/auth/validate")),
};
