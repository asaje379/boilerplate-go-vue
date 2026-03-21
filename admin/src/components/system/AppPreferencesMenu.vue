<script setup lang="ts">
import { Languages, Monitor, MoonStar, SunMedium } from "lucide-vue-next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n";
import type { ThemePreference } from "@/stores/preferences";

defineProps<{
  locale: AppLocale;
  localeLabels: Record<AppLocale, string>;
  supportedLocales: readonly AppLocale[];
  theme: ThemePreference;
  themeLabels: Record<ThemePreference, string>;
}>();

const emit = defineEmits<{
  "update:locale": [value: AppLocale];
  "update:theme": [value: ThemePreference];
}>();

const themeIcons = {
  light: SunMedium,
  dark: MoonStar,
  system: Monitor,
} as const;
</script>

<template>
  <div class="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon-sm" class="relative">
          <component :is="themeIcons[theme]" class="size-4" />
          <span class="sr-only">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-44">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          :model-value="theme"
          @update:model-value="emit('update:theme', $event as ThemePreference)"
        >
          <DropdownMenuRadioItem value="light">{{ themeLabels.light }}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{{ themeLabels.dark }}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">{{ themeLabels.system }}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon-sm" class="relative">
          <Languages class="size-4" />
          <span class="sr-only">Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-40">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          :model-value="locale"
          @update:model-value="emit('update:locale', $event as AppLocale)"
        >
          <DropdownMenuRadioItem v-for="option in supportedLocales" :key="option" :value="option">
            {{ localeLabels[option] }}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
