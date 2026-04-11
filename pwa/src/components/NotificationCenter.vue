<template>
  <section class="panel">
    <div class="section-head">
      <div>
        <p class="eyebrow">Notifications</p>
        <h2>{{ title }}</h2>
      </div>
      <button class="button secondary" :disabled="unreadCount === 0" @click="$emit('markAllRead')">
        Mark all read
      </button>
    </div>

    <p v-if="loading">Loading notifications...</p>
    <p v-else-if="items.length === 0">No notifications yet.</p>

    <div v-else class="notification-list">
      <button
        v-for="item in items"
        :key="item.id"
        class="notification-card"
        :class="{ read: !!item.readAt }"
        @click="$emit('select', item.id)"
      >
        <div class="notification-topline">
          <strong>{{ item.title }}</strong>
          <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
        </div>
        <p>{{ item.body }}</p>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { NotificationItem } from "@/types";

defineProps<{
  items: NotificationItem[];
  loading: boolean;
  title: string;
  unreadCount: number;
}>();

defineEmits<{
  markAllRead: [];
  select: [id: string];
}>();
</script>
