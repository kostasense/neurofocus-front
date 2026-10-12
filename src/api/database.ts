import { apiClient, apiData } from "@/lib/api-client";
export const databaseApi = { health: () => apiData(apiClient.get("/health")) };
