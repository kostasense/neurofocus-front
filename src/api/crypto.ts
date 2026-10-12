import { apiClient, apiData } from "@/lib/api-client";
export const cryptoApi = {
  status: () => apiData(apiClient.get("/crypto/status")),
};
