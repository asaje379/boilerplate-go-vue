<script setup lang="ts">
import { Bell } from "lucide-vue-next";
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread?: boolean;
}

const props = defineProps<{
  notifications: readonly NotificationItem[];
}>();

const unreadCount = computed(
  () => props.notifications.filter((notification) => notification.unread).length,
);
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon-sm" class="relative">
        <Bell class="size-4" />
        <Badge
          v-if="unreadCount > 0"
          class="absolute -top-1 -right-1 min-w-4 px-1 text-[10px] leading-none"
        >
          {{ unreadCount > 9 ? "9+" : unreadCount }}
        </Badge>
        <span class="sr-only">Notifications</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-80">
      <DropdownMenuLabel class="flex items-center justify-between gap-2">
        <span>Notifications</span>
        <span class="text-muted-foreground text-xs font-normal">{{ unreadCount }} unread</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <template v-if="notifications.length">
        <DropdownMenuItem
          v-for="notification in notifications"
          :key="notification.id"
          class="items-start gap-3 py-3"
        >
          <div
            class="bg-primary mt-1 size-2 shrink-0 rounded-full"
            :class="!notification.unread && 'bg-muted'"
          />
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <p class="truncate text-sm font-medium">{{ notification.title }}</p>
              <span class="text-muted-foreground shrink-0 text-xs">{{ notification.time }}</span>
            </div>
            <p class="text-muted-foreground line-clamp-2 text-xs">{{ notification.description }}</p>
          </div>
        </DropdownMenuItem>
      </template>
      <div v-else class="text-muted-foreground px-2 py-6 text-center text-sm">No notifications</div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
