<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useId } from 'reka-ui'
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { FormSwitchValue as SwitchValue } from '@/types/system-form'

const props = defineProps<{
  class?: HTMLAttributes['class']
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  modelValue?: SwitchValue
  name?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [payload: SwitchValue]
}>()

const inputId = useId()

function updateValue(value: SwitchValue) {
  emit('update:modelValue', value)
}

function normalizeValue(value: unknown): SwitchValue {
  if (value === true || value === false || value === null) {
    return value
  }

  return null
}
</script>

<template>
  <FormField v-if="name" v-slot="{ value, setValue }" :name="name">
    <FormItem :class="cn('gap-3', props.class)">
      <div class="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-4">
        <div class="grid gap-1.5 leading-none">
          <FormLabel v-if="label" :for="inputId" class="leading-5">{{ label }}</FormLabel>
          <FormDescription v-if="description">{{ description }}</FormDescription>
        </div>

        <Switch
          :id="inputId"
          :disabled="disabled"
          :model-value="normalizeValue(value)"
          @update:model-value="(nextValue) => setValue(nextValue)"
        />
      </div>

      <FormMessage />
    </FormItem>
  </FormField>

  <div v-else :class="cn('grid gap-2', props.class)">
    <div class="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-4">
      <div class="grid gap-1.5 leading-none">
        <Label v-if="label" :for="inputId" class="leading-5">{{ label }}</Label>
        <p v-if="description" class="text-muted-foreground text-sm">{{ description }}</p>
      </div>

      <Switch
        :id="inputId"
        :disabled="disabled"
        :model-value="modelValue"
        @update:model-value="updateValue"
      />
    </div>

    <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
  </div>
</template>
