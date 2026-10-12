import { apiClient, apiData } from "@/lib/api-client";
import { Appointment } from "@/types/api";
export const appointmentsApi = {
  schedules: (id: number, includeInactive = false) =>
    apiData(
      apiClient.get(`/appointments/schedules/psychologist/${id}`, {
        params: { includeInactive },
      }),
    ),
  createSchedule: (id: number, d: any) =>
    apiData(apiClient.post(`/appointments/schedules/psychologist/${id}`, d)),
  updateSchedule: (id: number, d: any) =>
    apiData(apiClient.patch(`/appointments/schedules/${id}`, d)),
  deactivateSchedule: (id: number) =>
    apiData(apiClient.patch(`/appointments/schedules/${id}/deactivate`)),
  create: (d: any) => apiData(apiClient.post("/appointments", d)),
  byPatient: (id: number) =>
    apiData<Appointment[]>(apiClient.get(`/appointments/patient/${id}`)),
  dashboard: (id: number, from?: string, to?: string) =>
    apiData<Appointment[]>(
      apiClient.get(`/appointments/dashboard/psychologist/${id}`, {
        params: { from, to },
      }),
    ),
  byPsychologist: (id: number, from?: string, to?: string) =>
    apiData(
      apiClient.get(`/appointments/psychologist/${id}`, {
        params: { from, to },
      }),
    ),
  status: (id: number, estado: number) =>
    apiData(apiClient.patch(`/appointments/${id}/status`, { estado })),
  cancel: (id: number, motivoCancelacion: string) =>
    apiData(
      apiClient.patch(`/appointments/${id}/cancel`, { motivoCancelacion }),
    ),
  reschedule: (id: number, d: any) =>
    apiData(apiClient.patch(`/appointments/${id}/reschedule`, d)),
  get: (id: number) => apiData(apiClient.get(`/appointments/${id}`)),
};
