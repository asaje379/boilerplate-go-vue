<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

defineProps<{
  actionLabel?: string;
  description: string;
  title: string;
}>();

defineEmits<{
  action: [];
}>();
</script>

<template>
  <section class="space-y-6">
    <Card class="border-border/60 bg-card/90">
      <CardHeader class="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle class="flex items-center gap-2">
            <span>{{ title }}</span>
            <slot name="badge" />
          </CardTitle>
          <CardDescription>{{ description }}</CardDescription>
        </div>

        <div class="flex items-center gap-3">
          <slot name="actions">
            <Button
              v-if="actionLabel"
              @click="$emit('action')"
            >
              {{ actionLabel }}
            </Button>
          </slot>
        </div>
      </CardHeader>

      <CardContent>
        <slot />
      </CardContent>
    </Card>
  </section>
</template>
