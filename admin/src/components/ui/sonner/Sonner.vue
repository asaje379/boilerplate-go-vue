<script lang="ts" setup>
import type { ToasterProps } from "vue-sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-vue-next";
import { Toaster as Sonner } from "vue-sonner";
import { cn } from "@/lib/utils";

const props = defineProps<ToasterProps>();
</script>

<template>
  <Sonner :class="cn('toaster group', props.class)" v-bind="props">
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>

<style>
.toaster {
  --normal-bg: oklch(0.42 0.18 264);
  --normal-text: oklch(0.99 0 0);
  --normal-border: oklch(0.52 0.2 264);
  --border-radius: var(--radius);
  --success-bg: oklch(0.58 0.24 145);
  --success-text: oklch(0.99 0 0);
  --info-bg: oklch(0.56 0.23 252);
  --info-text: oklch(0.99 0 0);
  --warning-bg: oklch(0.68 0.2 78);
  --warning-text: oklch(0.99 0 0);
  --error-bg: oklch(0.58 0.24 28);
  --error-text: oklch(0.99 0 0);
}

.toaster [data-sonner-toast] {
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.28);
  color: oklch(0.99 0 0);
}

.toaster [data-sonner-toast][data-styled="true"] {
  background: oklch(0.42 0.18 264) !important;
  border-color: oklch(0.52 0.2 264) !important;
  color: oklch(0.99 0 0) !important;
}

.toaster [data-sonner-toast][data-type="success"][data-styled="true"] {
  background: oklch(0.58 0.24 145) !important;
  border-color: oklch(0.5 0.21 145) !important;
  color: oklch(0.99 0 0) !important;
}

.toaster [data-sonner-toast][data-type="info"][data-styled="true"] {
  background: oklch(0.56 0.23 252) !important;
  border-color: oklch(0.48 0.21 252) !important;
  color: oklch(0.99 0 0) !important;
}

.toaster [data-sonner-toast][data-type="warning"][data-styled="true"] {
  background: oklch(0.68 0.2 78) !important;
  border-color: oklch(0.6 0.18 78) !important;
  color: oklch(0.99 0 0) !important;
}

.toaster [data-sonner-toast][data-type="error"][data-styled="true"] {
  background: oklch(0.58 0.24 28) !important;
  border-color: oklch(0.5 0.21 28) !important;
  color: oklch(0.99 0 0) !important;
}

.toaster [data-sonner-toast][data-styled="true"] [data-title],
.toaster [data-sonner-toast][data-styled="true"] [data-description],
.toaster [data-sonner-toast][data-styled="true"] [data-close-button] {
  color: oklch(0.99 0 0) !important;
}

.toaster [data-sonner-toast][data-type="success"] [data-icon],
.toaster [data-sonner-toast][data-type="info"] [data-icon],
.toaster [data-sonner-toast][data-type="warning"] [data-icon],
.toaster [data-sonner-toast][data-type="error"] [data-icon] {
  color: oklch(0.99 0 0) !important;
}
</style>
