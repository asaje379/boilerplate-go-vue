<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, watch } from 'vue'
import { ref } from 'vue'
import { getCitiesByCountryId } from '@/lib/location-data'
import FormInput from './FormInput.vue'
import FormSelect from './FormSelect.vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
  countryId?: string
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  modelValue?: string
  name?: string
  placeholder?: string
  triggerClass?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const cities = ref<string[]>([])

const options = computed(() =>
  cities.value.map((city) => ({
    label: city,
    value: city,
  })),
)

watch(
  () => props.countryId,
  async (countryId) => {
    cities.value = countryId ? await getCitiesByCountryId(countryId) : []
    if (props.modelValue && cities.value.length > 0 && !cities.value.includes(props.modelValue)) {
      emit('update:modelValue', '')
    }
  },
  { immediate: true },
)
</script>

<template>
  <FormSelect
    v-if="options.length > 0"
    :class="props.class"
    :description="description"
    :disabled="disabled"
    :error="error"
    :label="label"
    :model-value="modelValue"
    :name="name"
    :options="options"
    :placeholder="placeholder"
    :trigger-class="triggerClass"
    @update:model-value="(value) => emit('update:modelValue', String(value || ''))"
  />

  <FormInput
    v-else
    :class="props.class"
    :description="description"
    :disabled="disabled"
    :error="error"
    :label="label"
    :model-value="modelValue"
    :name="name"
    :placeholder="placeholder"
    @update:model-value="(value) => emit('update:modelValue', String(value || ''))"
  />
</template>
