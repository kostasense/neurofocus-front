import { apiClient, apiData } from "@/lib/api-client";
import { Evaluation } from "@/types/api";

export type InstrumentApplication = {
  id_aplicacion: number | string;
  id_evaluacion: number | string;
  id_instrumento: number;
  estado: 1 | 2 | 3 | 4; // En proceso, Completada, Abandonada, Anulada
  fecha_inicio?: string;
  puntaje_total?: number | null;
  nivel?: number | null;
  alerta_prioritaria?: boolean | number | null;
  respuestas?: { numero_reactivo: number; valor: number }[];
};

export type SubmitPayload = {
  respuestas: { numeroReactivo: number; valor: number }[];
  dificultadFuncional?: number; // solo PHQ-9
};

export const evaluationsApi = {
  instruments: () => apiData(apiClient.get("/evaluations/instruments")),
  create: (idPaciente?: number) =>
    apiData<Evaluation>(apiClient.post("/evaluations", { idPaciente })),
  byPatient: (id: number) =>
    apiData<Evaluation[]>(apiClient.get(`/evaluations/patient/${id}`)),
  byPsychologist: (id: number, pendingReview = false) =>
    apiData<Evaluation[]>(
      apiClient.get(`/evaluations/psychologist/${id}`, {
        params: { pendingReview },
      }),
    ),
  get: (id: number) => apiData<Evaluation>(apiClient.get(`/evaluations/${id}`)),
  start: (id: number, idInstrumento: number) =>
    apiData<InstrumentApplication>(
      apiClient.post(`/evaluations/${id}/instruments`, { idInstrumento }),
    ),
  application: (id: number) =>
    apiData<InstrumentApplication>(
      apiClient.get(`/evaluations/applications/${id}`),
    ),
  submit: (id: number, d: SubmitPayload) =>
    apiData<InstrumentApplication>(
      apiClient.post(`/evaluations/applications/${id}/submit`, d),
    ),
  abandon: (id: number) =>
    apiData<InstrumentApplication>(
      apiClient.patch(`/evaluations/applications/${id}/abandon`),
    ),
  closeIncomplete: (id: number) =>
    apiData<Evaluation>(apiClient.patch(`/evaluations/${id}/close-incomplete`)),
  review: (id: number) =>
    apiData<Evaluation>(apiClient.patch(`/evaluations/${id}/review`)),
  cancel: (id: number) =>
    apiData<Evaluation>(apiClient.patch(`/evaluations/${id}/cancel`)),
};
