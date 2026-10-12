import { apiClient, apiData } from "@/lib/api-client";
export const patientsApi = {
  list: () => apiData(apiClient.get("/patients")),
  get: (id: number) => apiData(apiClient.get(`/patients/${id}`)),
  update: (id: number, d: any) =>
    apiData(apiClient.patch(`/patients/${id}`, d)),
};
