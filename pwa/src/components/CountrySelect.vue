<template>
  <label class="field">
    <span>{{ label }}</span>
    <select class="select" :disabled="disabled" :value="modelValue || ''" @change="onChange">
      <option value="">{{ placeholder }}</option>
      <option v-for="country in countries" :key="country.id" :value="country.id">
        {{ country.flag }} {{ country.nameEn }}{{ country.dialCode ? ` (${country.dialCode})` : '' }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import type { CountryDatasetCountry } from "@/types";

defineProps<{
  countries: CountryDatasetCountry[];
  disabled?: boolean;
  label?: string;
  modelValue?: string | null;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value || "");
}
</script>
