<template>
  <div class="phone-grid">
    <CountrySelect
      :countries="countries"
      :disabled="disabled"
      :label="countryLabel"
      :model-value="countryId"
      :placeholder="countryPlaceholder"
      @update:model-value="updateCountry"
    />

    <label class="field">
      <span>{{ label }}</span>
      <div class="phone-row">
        <span class="dial-code">{{ currentCountry?.flag || '🌍' }} {{ currentCountry?.dialCode || '+' }}</span>
        <input class="input" :disabled="disabled" :placeholder="placeholder" :value="localPhone" @input="onInputChange" />
      </div>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import CountrySelect from "@/components/CountrySelect.vue";
import { extractLocalPhoneFromE164, normalizeLocalPhoneToE164 } from "@/lib/phone";
import type { CountryDatasetCountry } from "@/types";

const props = defineProps<{
  countries: CountryDatasetCountry[];
  countryId?: string | null;
  countryLabel?: string;
  countryPlaceholder?: string;
  disabled?: boolean;
  label?: string;
  modelValue?: string | null;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:countryId": [value: string];
  "update:modelValue": [value: string];
}>();

const currentCountry = computed(() => props.countries.find((country) => country.id === props.countryId) || null);
const localPhone = computed(() => extractLocalPhoneFromE164(props.modelValue, currentCountry.value?.dialCode));

watch(
  () => props.modelValue,
  () => {
    if (!props.countryId && props.modelValue) {
      const match = [...props.countries]
        .filter((country) => country.dialCode && String(props.modelValue).startsWith(country.dialCode))
        .sort((left, right) => right.dialCode.length - left.dialCode.length)[0];
      if (match) {
        emit("update:countryId", match.id);
      }
    }
  },
  { immediate: true },
);

function updateCountry(countryId: string) {
  emit("update:countryId", countryId);
  const country = props.countries.find((entry) => entry.id === countryId);
  emit("update:modelValue", normalizeLocalPhoneToE164(localPhone.value, country?.dialCode));
}

function onInputChange(event: Event) {
  emit("update:modelValue", normalizeLocalPhoneToE164((event.target as HTMLInputElement).value || "", currentCountry.value?.dialCode));
}
</script>
