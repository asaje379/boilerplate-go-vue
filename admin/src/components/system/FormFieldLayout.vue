<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const props = defineProps<{
  class?: HTMLAttributes['class']
  description?: string
  error?: string
  forId?: string
  label?: string
  vee?: boolean
}>()
</script>

<template>
  <FormItem v-if="vee" :class="props.class">
    <FormLabel v-if="label">{{ label }}</FormLabel>
    <FormControl>
      <slot />
    </FormControl>
    <FormDescription v-if="description">{{ description }}</FormDescription>
    <FormMessage />
  </FormItem>

  <div v-else :class="cn('grid gap-2', props.class)">
    <Label v-if="label" :for="forId">{{ label }}</Label>
    <slot />
    <p v-if="description" class="text-muted-foreground text-sm">{{ description }}</p>
    <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
  </div>
</template>
