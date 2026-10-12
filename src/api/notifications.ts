import { apiClient, apiData } from "@/lib/api-client";
import type { Notification } from "@/types/api";

export const notificationsApi = {
  create: (d: any) =>
    apiData<Notification>(apiClient.post("/notifications", d)),
  mine: (params?: { limite?: number }) =>
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
