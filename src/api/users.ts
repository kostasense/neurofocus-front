import { apiClient, apiData } from "@/lib/api-client";
import { User } from "@/types/api";
export const usersApi = {
  register: (d: any) => apiData(apiClient.post("/users/register", d)),
  create: (d: any) => apiData(apiClient.post("/users", d)),
  list: (idRol?: number) =>
    apiData<User[]>(apiClient.get("/users", { params: { idRol } })),
  get: (id: number) => apiData(apiClient.get(`/users/${id}`)),
  update: (id: number, d: any) => apiData(apiClient.patch(`/users/${id}`, d)),
  changePassword: (id: number, d: any) =>
    apiData(apiClient.patch(`/users/${id}/password`, d)),
  setActive: (id: number, a: boolean) =>
    apiData(apiClient.patch(`/users/${id}/${a ? "reactivate" : "deactivate"}`)),
};
