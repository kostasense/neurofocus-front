import { apiClient, apiData } from "@/lib/api-client";
import type { Notification } from "@/types/api";

export type NotificationsQuery = {
  limite?: number; // 1 a 100 (por defecto 30)
  desplazamiento?: number;
  soloNoLeidas?: boolean;
  tipo?: number; // 1 cita, 2 chat, 3 pánico, 4 sistema
  prioridad?: number; // 1 normal, 2 alta, 3 crítica
};

export const notificationsApi = {
  create: (d: any) =>
    apiData<Notification>(apiClient.post("/notifications", d)),
  mine: (params?: NotificationsQuery) =>
    apiData<Notification[]>(apiClient.get("/notifications/mine", { params })),
  unreadCount: () =>
    apiData<{ total: number }>(
      apiClient.get("/notifications/mine/unread-count"),
    ),
  readAll: () => apiData<void>(apiClient.patch("/notifications/mine/read-all")),
  get: (id: number) =>
    apiData<Notification>(apiClient.get(`/notifications/${id}`)),
  read: (id: number) =>
    apiData<Notification>(apiClient.patch(`/notifications/${id}/read`)),
  unread: (id: number) =>
    apiData<Notification>(apiClient.patch(`/notifications/${id}/unread`)),
};
