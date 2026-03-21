<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useId } from 'reka-ui'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { FormCheckboxValue as CheckboxValue } from '@/types/system-form'

const props = defineProps<{
  class?: HTMLAttributes['class']
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  modelValue?: CheckboxValue
  name?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [payload: CheckboxValue]
}>()

const inputId = useId()

function updateValue(value: CheckboxValue) {
  emit('update:modelValue', value)
}

function normalizeValue(value: unknown): CheckboxValue {
  if (value === true || value === false || value === 'indeterminate' || value === null) {
    return value
  }

  return null
}
</script>

<template>
  <FormField v-if="name" v-slot="{ value, setValue }" :name="name">
    <FormItem :class="cn('gap-3', props.class)">
      <div class="flex items-start gap-3">
        <FormControl>
          <Checkbox
            :id="inputId"
            :disabled="disabled"
            :model-value="normalizeValue(value)"
            @update:model-value="(nextValue) => setValue(nextValue)"
          />
        </FormControl>

        <div class="grid gap-1.5 leading-none">
          <FormLabel v-if="label" class="leading-5">{{ label }}</FormLabel>
          <FormDescription v-if="description">{{ description }}</FormDescription>
        </div>
      </div>

      <FormMessage />
    </FormItem>
  </FormField>

  <div v-else :class="cn('grid gap-2', props.class)">
    <div class="flex items-start gap-3">
      <Checkbox
        :id="inputId"
        :disabled="disabled"
        :model-value="modelValue"
        @update:model-value="updateValue"
      />

      <div class="grid gap-1.5 leading-none">
        <Label v-if="label" :for="inputId" class="leading-5">{{ label }}</Label>
        <p v-if="description" class="text-muted-foreground text-sm">{{ description }}</p>
      </div>
    </div>

    <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
  </div>
</template>
