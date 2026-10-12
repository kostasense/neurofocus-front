import { apiClient, apiData } from "@/lib/api-client";
import { DashboardPatient, Psychologist } from "@/types/api";
export const psychologistsApi = {
  list: (soloActivosParaCitas = true) =>
    apiData<Psychologist[]>(
      apiClient.get("/psychologists", { params: { soloActivosParaCitas } }),
    ),
  dashboardPatients: (id: number) =>
    apiData<DashboardPatient[]>(
      apiClient.get(`/psychologists/${id}/dashboard/patients`),
    ),
  get: (id: number) => apiData(apiClient.get(`/psychologists/${id}`)),
  update: (id: number, d: any) =>
    apiData(apiClient.patch(`/psychologists/${id}`, d)),
  setChat: (id: number, v: boolean) =>
    apiData(apiClient.patch(`/psychologists/${id}/chat/${v}`)),
  setAppointments: (id: number, v: boolean) =>
    apiData(apiClient.patch(`/psychologists/${id}/appointments/${v}`)),
};
