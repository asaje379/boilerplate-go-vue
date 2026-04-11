<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import FormInput from './FormInput.vue'
import CountrySelect from './CountrySelect.vue'
import { getCountryByDialCode, getCountryById } from '@/lib/location-data'
import { extractLocalPhoneFromE164, normalizeLocalPhoneToE164 } from '@/lib/phone'

const props = defineProps<{
  countryId?: string
  countryLabel?: string
  disabled?: boolean
  label?: string
  modelValue?: string
  phoneLabel?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:countryId': [value: string]
  'update:modelValue': [value: string]
}>()

const localPhone = ref('')
const dialCode = ref('')

async function syncFromProps() {
  let resolvedCountry = props.countryId ? await getCountryById(props.countryId) : null
  if (!resolvedCountry && props.modelValue) {
    resolvedCountry = await getCountryByDialCode(props.modelValue)
    if (resolvedCountry) {
      emit('update:countryId', resolvedCountry.id)
    }
  }

  dialCode.value = resolvedCountry?.dialCode || ''
  localPhone.value = extractLocalPhoneFromE164(props.modelValue, dialCode.value)
}

function emitPhone() {
  emit('update:modelValue', normalizeLocalPhoneToE164(localPhone.value, dialCode.value))
}

function updateLocalPhone(value: string) {
  localPhone.value = value
}

watch(() => props.modelValue, () => void syncFromProps())
watch(() => props.countryId, () => void syncFromProps())
watch(localPhone, () => emitPhone())

onMounted(() => {
  void syncFromProps()
})

async function updateCountry(countryId: string) {
  emit('update:countryId', countryId)
  const country = await getCountryById(countryId)
  dialCode.value = country?.dialCode || ''
  emitPhone()
}

const countryPlaceholder = computed(() => props.countryLabel || 'Select country')
const phonePlaceholder = computed(() => props.placeholder || '77 000 00 00')
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
    <CountrySelect
      :disabled="disabled"
      :label="countryLabel || 'Country'"
      :model-value="countryId"
      :placeholder="countryPlaceholder"
      @update:model-value="updateCountry"
    />
    <FormInput
      :disabled="disabled"
      :label="phoneLabel || label || 'Phone number'"
      :model-value="localPhone"
      :placeholder="phonePlaceholder"
      @update:model-value="(value) => updateLocalPhone(String(value || ''))"
    >
      <template #leading>
        <span class="text-xs font-medium">{{ dialCode || '+' }}</span>
      </template>
    </FormInput>
  </div>
</template>
