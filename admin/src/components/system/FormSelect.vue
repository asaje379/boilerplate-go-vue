<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { AcceptableValue } from 'reka-ui'
import { useId } from 'reka-ui'
import { computed, useAttrs } from 'vue'
import { FormField } from '@/components/ui/form'
import type { FormSelectOption } from '@/types/system-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import FormFieldLayout from './FormFieldLayout.vue'

defineOptions({
  inheritAttrs: false,
})

type SelectValueType = AcceptableValue

const props = defineProps<{
  class?: HTMLAttributes['class']
  defaultValue?: SelectValueType
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  modelValue?: SelectValueType
  name?: string
  options: FormSelectOption[]
  placeholder?: string
  triggerClass?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [payload: SelectValueType]
}>()

const attrs = useAttrs()
const fallbackId = useId()
const triggerId = computed(() => String(attrs.id ?? `${fallbackId}-select`))

function updateValue(value: SelectValueType) {
  emit('update:modelValue', value)
}
</script>

<template>
  <FormField v-if="name" v-slot="{ componentField }" :name="name">
    <FormFieldLayout :class="props.class" :description="description" :label="label" vee>
      <Select v-bind="{ ...attrs, ...componentField }" :disabled="disabled">
        <SelectTrigger :id="triggerId" class="w-full" :class="triggerClass">
          <SelectValue :placeholder="placeholder" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="(option, index) in options"
            :key="`${String(option.value)}-${index}`"
            :disabled="option.disabled"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormFieldLayout>
  </FormField>

  <FormFieldLayout
    v-else
    :class="props.class"
    :description="description"
    :error="error"
    :for-id="triggerId"
    :label="label"
  >
    <Select
      :default-value="defaultValue"
      :disabled="disabled"
      :model-value="modelValue"
      @update:model-value="updateValue"
    >
      <SelectTrigger :id="triggerId" v-bind="attrs" class="w-full" :class="triggerClass">
        <SelectValue :placeholder="placeholder" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="(option, index) in options"
          :key="`${String(option.value)}-${index}`"
          :disabled="option.disabled"
          :value="option.value"
        >
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>
  </FormFieldLayout>
</template>
