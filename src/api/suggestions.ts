import { apiClient, apiData } from "@/lib/api-client";
import { Suggestion } from "@/types/api";
export const suggestionsApi = {
  create: (d: any) => apiData(apiClient.post("/suggestions", d)),
  mine: () => apiData(apiClient.get("/suggestions/mine")),
  list: (params?: any) =>
    apiData<Suggestion[]>(apiClient.get("/suggestions", { params })),
  get: (id: number) => apiData(apiClient.get(`/suggestions/${id}`)),
  update: (id: number, d: any) =>
    apiData(apiClient.patch(`/suggestions/${id}`, d)),
};
