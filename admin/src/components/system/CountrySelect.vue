<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, onMounted, ref } from 'vue'
import { listCountries, type CountryDatasetCountry } from '@/lib/location-data'
import FormSelect from './FormSelect.vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
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

const countries = ref<CountryDatasetCountry[]>([])

const options = computed(() =>
  countries.value.map((country) => ({
    label: `${country.flag} ${country.nameEn}${country.dialCode ? ` (${country.dialCode})` : ''}`,
    value: country.id,
  })),
)

onMounted(async () => {
  countries.value = await listCountries()
})
</script>

<template>
  <FormSelect
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
</template>
