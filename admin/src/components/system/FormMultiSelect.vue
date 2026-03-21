<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Check, ChevronDown, X } from 'lucide-vue-next'
import { useId } from 'reka-ui'
import { computed, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form'
import type { FormMultiSelectOption } from '@/types/system-form'
import FormFieldLayout from './FormFieldLayout.vue'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    description?: string
    disabled?: boolean
    error?: string
    label?: string
    modelValue?: string[]
    name?: string
    options: FormMultiSelectOption[]
    placeholder?: string
    triggerClass?: HTMLAttributes['class']
  }>(),
  {
    modelValue: () => [],
    placeholder: 'Select options',
  },
)

const emit = defineEmits<{
  'update:modelValue': [payload: string[]]
}>()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const triggerId = useId()

onClickOutside(rootRef, () => {
  isOpen.value = false
})

const optionMap = computed(() => new Map(props.options.map((option) => [option.value, option])))

function normalizeValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function selectedOptions(values: string[]) {
  return values
    .map((value) => optionMap.value.get(value))
    .filter(Boolean) as FormMultiSelectOption[]
}

function toggleOpen() {
  if (props.disabled) {
    return
  }

  isOpen.value = !isOpen.value
}

function toggleOption(values: string[], option: FormMultiSelectOption) {
  if (option.disabled || props.disabled) {
    return values
  }

  return values.includes(option.value)
    ? values.filter((value) => value !== option.value)
    : [...values, option.value]
}

function removeValue(values: string[], optionValue: string) {
  return values.filter((value) => value !== optionValue)
}

function updateStandalone(nextValue: string[]) {
  emit('update:modelValue', nextValue)
}
</script>

<template>
  <FormField v-if="name" v-slot="{ value, setValue }" :name="name">
    <FormFieldLayout :class="props.class" :description="description" :label="label" vee>
      <div ref="rootRef" class="relative">
        <Button
          :id="triggerId"
          type="button"
          variant="outline"
          class="min-h-10 w-full justify-between px-3 py-2"
          :class="triggerClass"
          :disabled="disabled"
          @click="toggleOpen"
        >
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
            <template v-if="selectedOptions(normalizeValue(value)).length">
              <Badge
                v-for="option in selectedOptions(normalizeValue(value))"
                :key="option.value"
                variant="secondary"
                class="max-w-full gap-1 rounded-full px-2 py-1"
              >
                <span class="truncate">{{ option.label }}</span>
                <span
                  role="button"
                  tabindex="0"
                  class="hover:text-foreground rounded-full"
                  @click.stop="setValue(removeValue(normalizeValue(value), option.value))"
                  @keydown.enter.stop="setValue(removeValue(normalizeValue(value), option.value))"
                  @keydown.space.prevent.stop="
                    setValue(removeValue(normalizeValue(value), option.value))
                  "
                >
                  <X class="size-3" />
                </span>
              </Badge>
            </template>
            <span v-else class="text-muted-foreground">{{ placeholder }}</span>
          </div>

          <ChevronDown class="text-muted-foreground size-4 shrink-0" />
        </Button>

        <div
          v-if="isOpen"
          class="bg-popover absolute top-full left-0 z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border p-1 shadow-md"
        >
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            class="hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm disabled:pointer-events-none disabled:opacity-50"
            :disabled="option.disabled"
            @click="setValue(toggleOption(normalizeValue(value), option))"
          >
            <span>{{ option.label }}</span>
            <Check
              v-if="normalizeValue(value).includes(option.value)"
              class="text-primary size-4 shrink-0"
            />
          </button>
        </div>
      </div>
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
    <div ref="rootRef" class="relative">
      <Button
        :id="triggerId"
        type="button"
        variant="outline"
        class="min-h-10 w-full justify-between px-3 py-2"
        :class="triggerClass"
        :disabled="disabled"
        @click="toggleOpen"
      >
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
          <template v-if="selectedOptions(modelValue).length">
            <Badge
              v-for="option in selectedOptions(modelValue)"
              :key="option.value"
              variant="secondary"
              class="max-w-full gap-1 rounded-full px-2 py-1"
            >
              <span class="truncate">{{ option.label }}</span>
              <span
                role="button"
                tabindex="0"
                class="hover:text-foreground rounded-full"
                @click.stop="updateStandalone(removeValue(modelValue, option.value))"
                @keydown.enter.stop="updateStandalone(removeValue(modelValue, option.value))"
                @keydown.space.prevent.stop="
                  updateStandalone(removeValue(modelValue, option.value))
                "
              >
                <X class="size-3" />
              </span>
            </Badge>
          </template>
          <span v-else class="text-muted-foreground">{{ placeholder }}</span>
        </div>

        <ChevronDown class="text-muted-foreground size-4 shrink-0" />
      </Button>

      <div
        v-if="isOpen"
        class="bg-popover absolute top-full left-0 z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border p-1 shadow-md"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm disabled:pointer-events-none disabled:opacity-50"
          :disabled="option.disabled"
          @click="updateStandalone(toggleOption(modelValue, option))"
        >
          <span>{{ option.label }}</span>
          <Check v-if="modelValue.includes(option.value)" class="text-primary size-4 shrink-0" />
        </button>
      </div>
    </div>
  </FormFieldLayout>
</template>
