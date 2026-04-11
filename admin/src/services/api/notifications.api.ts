import { apiRequest } from "@/services/http/client";
import type { ListQueryParams } from "@/types/api";
import type {
  NotificationUnreadCountResponse,
  PaginatedNotificationsResponse,
} from "@/types/notification";

function buildQuery(params: ListQueryParams = {}) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const notificationsApi = {
  list(params: ListQueryParams = {}) {
    return apiRequest<PaginatedNotificationsResponse>(`/notifications${buildQuery(params)}`);
  },
  markAllRead() {
    return apiRequest<{ message: string }>("/notifications/read-all", { method: "POST" });
  },
  markRead(id: string) {
    return apiRequest<{ message: string }>(`/notifications/${id}/read`, { method: "POST" });
  },
  unreadCount() {
    return apiRequest<NotificationUnreadCountResponse>("/notifications/unread-count");
  },
};
