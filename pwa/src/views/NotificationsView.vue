<template>
  <main class="page">
    <NotificationCenter
      title="Notifications"
      :items="items"
      :loading="isLoading"
      :unread-count="unreadCount"
      @mark-all-read="handleMarkAllRead"
      @select="handleSelect"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import NotificationCenter from "@/components/NotificationCenter.vue";
import { useNotificationsStore } from "@/stores/notifications";

const notifications = useNotificationsStore();
const items = computed(() => notifications.items);
const isLoading = computed(() => notifications.isLoading);
const unreadCount = computed(() => notifications.unreadCount);

async function handleSelect(id: string) {
  await notifications.markRead(id);
}

async function handleMarkAllRead() {
  await notifications.markAllRead();
}

onMounted(() => {
  if (!notifications.items.length) {
    void notifications.fetchLatest();
  }
});
</script>
