import { apiRequest } from "@/services/http/client";
import type { NotificationItem, PaginatedResponse } from "@/types";

export const notificationsApi = {
  list() {
    return apiRequest<PaginatedResponse<NotificationItem>>("/notifications?limit=20&page=1&sortBy=createdAt&sortOrder=desc");
  },
  markAllRead() {
    return apiRequest<{ message: string }>("/notifications/read-all", { method: "POST" });
  },
  markRead(id: string) {
    return apiRequest<{ message: string }>(`/notifications/${id}/read`, { method: "POST" });
  },
};
