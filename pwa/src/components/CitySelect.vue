<template>
  <label class="field">
    <span>{{ label }}</span>
    <select v-if="cities.length > 0" class="select" :disabled="disabled" :value="modelValue || ''" @change="onSelectChange">
      <option value="">{{ placeholder }}</option>
      <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
    </select>
    <input v-else class="input" :disabled="disabled" :placeholder="placeholder" :value="modelValue || ''" @input="onInputChange" />
  </label>
</template>

<script setup lang="ts">
defineProps<{
  cities: string[];
  disabled?: boolean;
  label?: string;
  modelValue?: string | null;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onSelectChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value || "");
}

function onInputChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value || "");
}
</script>
