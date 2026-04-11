import { defineStore } from "pinia";
import { readAccessToken } from "@/services/http/client";

type NotificationPayload = {
  notification?: {
    id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    readAt: string | null;
    createdAt: string;
  };
};

export const useRealtimeStore = defineStore("pwa-realtime", () => {
  let source: EventSource | null = null;

  function connect(onNotification: (payload: NonNullable<NotificationPayload["notification"]>) => void) {
    const token = readAccessToken();
    if (!token) {
      disconnect();
      return;
    }

    disconnect();
    const url = new URL(`${import.meta.env.VITE_REALTIME_BASE_URL}/rt/sse`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("channels", "notifications");
    source = new EventSource(url);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as { event: string; data?: NotificationPayload };
        if (event.event !== "notification.created") {
          return;
        }
        const payload = event.data?.notification;
        if (payload) {
          onNotification(payload);
        }
      } catch {
        return;
      }
    };
  }

  function disconnect() {
    if (source) {
      source.close();
      source = null;
    }
  }

  return {
    connect,
    disconnect,
  };
});
