<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotificationsStore } from "@/stores/notifications";

const { t } = useI18n();
const notifications = useNotificationsStore();
const { isLoading, items, unreadCount } = storeToRefs(notifications);

const sortedItems = computed(() => items.value);

async function markOne(id: string) {
  await notifications.markAsRead(id);
}

async function markAll() {
  await notifications.markAllAsRead();
}

onMounted(() => {
  if (!items.value.length) {
    void notifications.fetchLatest();
  }
});
</script>

<template>
  <section class="space-y-6">
    <Card class="border-border/60 bg-card/90">
      <CardHeader class="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{{ $t("notifications.title") }}</CardTitle>
          <CardDescription>{{ $t("notifications.unread", { count: unreadCount }) }}</CardDescription>
        </div>
        <Button variant="outline" :disabled="unreadCount === 0" @click="markAll">
          {{ $t("notifications.markAllRead") }}
        </Button>
      </CardHeader>
      <CardContent>
        <div v-if="isLoading" class="text-muted-foreground text-sm">{{ t("notifications.loading") }}</div>
        <div v-else-if="!sortedItems.length" class="text-muted-foreground text-sm">{{ t("notifications.empty") }}</div>
        <div v-else class="space-y-3">
          <div
            v-for="notification in sortedItems"
            :key="notification.id"
            class="rounded-2xl border p-4"
            :class="notification.readAt ? 'border-border/60 bg-muted/30' : 'border-primary/20 bg-primary/5'"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <p class="font-medium">{{ notification.title }}</p>
                <p class="text-muted-foreground text-sm">{{ notification.body }}</p>
                <p class="text-muted-foreground text-xs">{{ new Date(notification.createdAt).toLocaleString() }}</p>
              </div>
              <Button v-if="!notification.readAt" size="sm" variant="ghost" @click="markOne(notification.id)">
                {{ $t("notifications.markRead") }}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
