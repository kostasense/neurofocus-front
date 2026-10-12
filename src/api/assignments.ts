import { apiClient, apiData } from "@/lib/api-client";
export const assignmentsApi = {
  create: (d: any) => apiData(apiClient.post("/assignments", d)),
  close: (id: number, d: any) =>
    apiData(apiClient.patch(`/assignments/${id}/close`, d)),
  current: (p: number) =>
    apiData(apiClient.get(`/assignments/patient/${p}/current`)),
  history: (p: number) =>
    apiData(apiClient.get(`/assignments/patient/${p}/history`)),
  patients: (p: number) =>
    apiData(apiClient.get(`/assignments/psychologist/${p}/patients`)),
};
