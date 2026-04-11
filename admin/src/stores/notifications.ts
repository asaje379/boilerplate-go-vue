import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { notificationsApi } from "@/services/api/notifications.api";
import type { Notification } from "@/types/notification";

function sortNotifications(items: Notification[]) {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export const useNotificationsStore = defineStore("notifications", () => {
  const items = ref<Notification[]>([]);
  const isLoading = ref(false);
  const unreadCount = computed(() => items.value.filter((item) => !item.readAt).length);

  async function fetchLatest() {
    isLoading.value = true;
    try {
      const response = await notificationsApi.list({ limit: 20, page: 1, sortBy: "createdAt", sortOrder: "desc" });
      items.value = sortNotifications(response.items);
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshUnreadCount() {
    const response = await notificationsApi.unreadCount();
    if (response.count !== unreadCount.value) {
      await fetchLatest();
    }
  }

  async function markAsRead(id: string) {
    await notificationsApi.markRead(id);
    items.value = items.value.map((item) => (item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
  }

  async function markAllAsRead() {
    await notificationsApi.markAllRead();
    const now = new Date().toISOString();
    items.value = items.value.map((item) => ({ ...item, readAt: item.readAt || now }));
  }

  function pushRealtimeNotification(notification: Notification) {
    const withoutExisting = items.value.filter((item) => item.id !== notification.id);
    items.value = sortNotifications([notification, ...withoutExisting]);
  }

  function reset() {
    items.value = [];
    isLoading.value = false;
  }

  return {
    fetchLatest,
    isLoading,
    items,
    markAllAsRead,
    markAsRead,
    pushRealtimeNotification,
    refreshUnreadCount,
    reset,
    unreadCount,
  };
});
