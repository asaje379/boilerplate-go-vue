import type { PaginatedResponse } from "@/types/api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationUnreadCountResponse {
  count: number;
}

export type PaginatedNotificationsResponse = PaginatedResponse<Notification>;
