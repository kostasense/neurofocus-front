import { apiClient, apiData } from "@/lib/api-client";
import { ClinicalRecord, RecordSummary } from "@/types/api";
export const recordsApi = {
  create: (d: any) => apiData(apiClient.post("/records", d)),
  byPatient: (id: number) =>
    apiData<ClinicalRecord>(apiClient.get(`/records/patient/${id}`)),
  byPsychologist: (id: number) =>
    apiData<RecordSummary[]>(apiClient.get(`/records/psychologist/${id}`)),
  entry: (id: number) => apiData(apiClient.get(`/records/entries/${id}`)),
  cancelEntry: (id: number, d: any) =>
    apiData(apiClient.patch(`/records/entries/${id}/cancel`, d)),
  attachments: (id: number) =>
    apiData(apiClient.get(`/records/entries/${id}/attachments`)),
  createAttachment: (id: number, d: any) =>
    apiData(apiClient.post(`/records/entries/${id}/attachments`, d)),
  attachment: (id: number) =>
    apiData(apiClient.get(`/records/attachments/${id}`)),
  entries: (id: number) => apiData(apiClient.get(`/records/${id}/entries`)),
  createEntry: (id: number, d: any) =>
    apiData(apiClient.post(`/records/${id}/entries`, d)),
  changeResponsible: (id: number, d: any) =>
    apiData(apiClient.patch(`/records/${id}/responsible`, d)),
  close: (id: number, d: any) =>
    apiData(apiClient.patch(`/records/${id}/close`, d)),
  reopen: (id: number) => apiData(apiClient.patch(`/records/${id}/reopen`)),
  get: (id: number) => apiData(apiClient.get(`/records/${id}`)),
};
