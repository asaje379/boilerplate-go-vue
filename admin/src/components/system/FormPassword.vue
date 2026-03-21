<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import type { FormInputValue as ModelValue } from '@/types/system-form'
import FormInput from './FormInput.vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
  defaultValue?: ModelValue
  description?: string
  disabled?: boolean
  error?: string
  inputClass?: HTMLAttributes['class']
  label?: string
  modelValue?: ModelValue
  name?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [payload: ModelValue]
}>()

const isVisible = ref(false)

const currentType = computed(() => (isVisible.value ? 'text' : 'password'))
const icon = computed(() => (isVisible.value ? EyeOff : Eye))

function toggleVisibility() {
  isVisible.value = !isVisible.value
}
</script>

<template>
  <FormInput
    :class="props.class"
    :default-value="defaultValue"
    :description="description"
    :disabled="disabled"
    :error="error"
    :input-class="inputClass"
    :label="label"
    :model-value="modelValue"
    :name="name"
    :placeholder="placeholder"
    :type="currentType"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <template #trailing>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="size-6 rounded-full"
        :disabled="disabled"
        @click="toggleVisibility"
      >
        <component :is="icon" class="size-4" />
        <span class="sr-only">
          {{ isVisible ? 'Hide password' : 'Show password' }}
        </span>
      </Button>
    </template>
  </FormInput>
</template>
