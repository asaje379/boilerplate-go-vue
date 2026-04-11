import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { notificationsApi } from "@/services/api/notifications";
import type { NotificationItem } from "@/types";

function sortNotifications(items: NotificationItem[]) {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export const useNotificationsStore = defineStore("pwa-notifications", () => {
  const items = ref<NotificationItem[]>([]);
  const isLoading = ref(false);
  const unreadCount = computed(() => items.value.filter((item) => !item.readAt).length);

  async function fetchLatest() {
    isLoading.value = true;
    try {
      const response = await notificationsApi.list();
      items.value = sortNotifications(response.items);
    } finally {
      isLoading.value = false;
    }
  }

  async function markRead(id: string) {
    await notificationsApi.markRead(id);
    items.value = items.value.map((item) => (item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    const now = new Date().toISOString();
    items.value = items.value.map((item) => ({ ...item, readAt: item.readAt || now }));
  }

  function pushRealtimeNotification(item: NotificationItem) {
    items.value = sortNotifications([item, ...items.value.filter((current) => current.id !== item.id)]);
  }

  return {
    fetchLatest,
    isLoading,
    items,
    markAllRead,
    markRead,
    pushRealtimeNotification,
    unreadCount,
  };
});
