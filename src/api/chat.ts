import { apiClient, apiData } from "@/lib/api-client";
import { PanicAlert } from "@/types/api";
export const chatApi = {
  createChannel: (d: any) => apiData(apiClient.post("/chat/channels", d)),
  channels: () => apiData(apiClient.get("/chat/channels")),
  channel: (id: number) => apiData(apiClient.get(`/chat/channels/${id}`)),
  enable: (id: number, v: boolean) =>
    apiData(apiClient.patch(`/chat/channels/${id}/enabled/${v}`)),
  close: (id: number) => apiData(apiClient.patch(`/chat/channels/${id}/close`)),
  registerKey: (id: number, d: any) =>
    apiData(apiClient.post(`/chat/channels/${id}/keys`, d)),
  myKey: (id: number, v: number) =>
    apiData(apiClient.get(`/chat/channels/${id}/keys/${v}`)),
  send: (id: number, d: any) =>
    apiData(apiClient.post(`/chat/channels/${id}/messages`, d)),
  messages: (id: number, beforeId?: number, limit = 50) =>
    apiData(
      apiClient.get(`/chat/channels/${id}/messages`, {
        params: { beforeId, limit },
      }),
    ),
  delivered: (id: number) =>
    apiData(apiClient.patch(`/chat/messages/${id}/delivered`)),
  read: (id: number) => apiData(apiClient.patch(`/chat/messages/${id}/read`)),
  hide: (id: number) => apiData(apiClient.patch(`/chat/messages/${id}/hide`)),
  panic: (id: number, d: any) =>
    apiData(apiClient.post(`/chat/channels/${id}/panic`, d)),
  alerts: (estado?: number) =>
    apiData<PanicAlert[]>(
      apiClient.get("/chat/panic-alerts", { params: { estado } }),
    ),
  alertStatus: (id: number, estado: number) =>
    apiData(apiClient.patch(`/chat/panic-alerts/${id}/status`, { estado })),
};
