<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Search } from 'lucide-vue-next'
import { watchDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    debounceMs?: number
    inputClass?: HTMLAttributes['class']
    modelValue?: string
    placeholder?: string
  }>(),
  {
    debounceMs: 500,
    modelValue: '',
    placeholder: 'Search...',
  },
)

const emit = defineEmits<{
  search: [value: string]
  'update:modelValue': [value: string]
}>()

const localValue = ref(props.modelValue)

watch(
  () => props.modelValue,
  (value) => {
    localValue.value = value
  },
)

watch(localValue, (value) => {
  emit('update:modelValue', value)
})

watchDebounced(
  localValue,
  (value) => {
    emit('search', value)
  },
  { debounce: computed(() => props.debounceMs), maxWait: computed(() => props.debounceMs) },
)
</script>

<template>
  <div :class="cn('relative grid grid-cols-[auto_1fr] items-center', props.class)">
    <Search class="text-muted-foreground pointer-events-none absolute left-3 size-4" />
    <Input
      :model-value="localValue"
      :placeholder="placeholder"
      :class="cn('pl-10', inputClass)"
      @update:model-value="(value) => (localValue = String(value))"
    />
  </div>
</template>
