<script setup lang="ts">
import { ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-vue-next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const props = defineProps<{
  compact?: boolean;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
}>();

const emit = defineEmits<{
  profile: [];
  logout: [];
}>();

const initials = `${props.firstName.charAt(0)}${props.lastName.charAt(0)}`.toUpperCase();
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        :class="
          props.compact
            ? 'flex h-10 w-10 items-center justify-center px-0'
            : 'flex h-10 max-w-64 items-center gap-3 px-2'
        "
      >
        <Avatar class="size-8">
          <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="`${firstName} ${lastName}`" />
          <AvatarFallback class="text-xs font-medium">{{ initials }}</AvatarFallback>
        </Avatar>
        <div v-if="!props.compact" class="min-w-0 flex-1 text-left">
          <p class="truncate text-sm font-medium">{{ firstName }} {{ lastName }}</p>
          <p class="text-muted-foreground truncate text-xs">{{ role }}</p>
        </div>
        <ChevronDown v-if="!props.compact" class="text-muted-foreground size-4 shrink-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-64">
      <DropdownMenuLabel class="flex items-center gap-3">
        <Avatar class="size-9">
          <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="`${firstName} ${lastName}`" />
          <AvatarFallback class="text-xs font-medium">{{ initials }}</AvatarFallback>
        </Avatar>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">{{ firstName }} {{ lastName }}</p>
          <p class="text-muted-foreground truncate text-xs">{{ role }}</p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem @select="emit('profile')">
        <UserCircle2 />
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Settings />
        Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" @select="emit('logout')">
        <LogOut />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
