import { apiRequest } from "@/services/http/client";
import type { UserProfile } from "@/types";

export const usersApi = {
  getCurrent() {
    return apiRequest<UserProfile>("/users/me");
  },
  updateNotificationPrefs(payload: {
    notifyEmail: boolean;
    notifyInApp: boolean;
    notifyWhatsapp: boolean;
    whatsAppPhone?: string;
  }) {
    return apiRequest<UserProfile>("/users/me/notifications", {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
};
