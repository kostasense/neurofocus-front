import { apiClient, apiData } from "@/lib/api-client";
import { Evaluation } from "@/types/api";
export const evaluationsApi = {
  instruments: () => apiData(apiClient.get("/evaluations/instruments")),
  create: (idPaciente?: number) =>
    apiData(apiClient.post("/evaluations", { idPaciente })),
  byPatient: (id: number) =>
    apiData<Evaluation[]>(apiClient.get(`/evaluations/patient/${id}`)),
  byPsychologist: (id: number, pendingReview = false) =>
    apiData<Evaluation[]>(
      apiClient.get(`/evaluations/psychologist/${id}`, {
        params: { pendingReview },
      }),
    ),
  get: (id: number) => apiData(apiClient.get(`/evaluations/${id}`)),
  start: (id: number, idInstrumento: number) =>
    apiData(
      apiClient.post(`/evaluations/${id}/instruments`, { idInstrumento }),
    ),
  application: (id: number) =>
    apiData(apiClient.get(`/evaluations/applications/${id}`)),
  submit: (id: number, d: any) =>
    apiData(apiClient.post(`/evaluations/applications/${id}/submit`, d)),
  abandon: (id: number) =>
    apiData(apiClient.patch(`/evaluations/applications/${id}/abandon`)),
  closeIncomplete: (id: number) =>
    apiData(apiClient.patch(`/evaluations/${id}/close-incomplete`)),
  review: (id: number) => apiData(apiClient.patch(`/evaluations/${id}/review`)),
  cancel: (id: number) => apiData(apiClient.patch(`/evaluations/${id}/cancel`)),
};
