<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { DateRange, DateValue } from 'reka-ui'
import { getLocalTimeZone } from '@internationalized/date'
import { onClickOutside } from '@vueuse/core'
import { CalendarDays } from 'lucide-vue-next'
import { useId } from 'reka-ui'
import { toDate } from 'reka-ui/date'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { FormField } from '@/components/ui/form'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { cn } from '@/lib/utils'
import type { AnyDateValue, FormDateValue } from '@/types/system-form'
import FormFieldLayout from './FormFieldLayout.vue'

type CommonProps = {
  calendarClass?: HTMLAttributes['class']
  class?: HTMLAttributes['class']
  defaultValue?: unknown
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  locale?: string
  modelValue?: unknown
  name?: string
  numberOfMonths?: number
  placeholder?: string
}

type SingleDateProps = CommonProps & {
  range?: false
}

type RangeDateProps = CommonProps & {
  range: true
}

const props = withDefaults(defineProps<SingleDateProps | RangeDateProps>(), {
  locale: 'fr-FR',
  numberOfMonths: 1,
  placeholder: 'Select a date',
  range: false,
})

const emit = defineEmits<{
  'update:modelValue': [payload: FormDateValue]
}>()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const triggerId = useId()

const calendarMonths = computed(() =>
  props.range ? Math.max(props.numberOfMonths, 2) : props.numberOfMonths,
)

onClickOutside(rootRef, () => {
  isOpen.value = false
})

function isDateRangeValue(value: unknown): value is DateRange {
  return typeof value === 'object' && value !== null && 'start' in value && 'end' in value
}

function normalizeSingleValue(value: unknown): AnyDateValue | undefined {
  return value && !isDateRangeValue(value) ? (value as AnyDateValue) : undefined
}

function normalizeRangeValue(value: unknown): DateRange | undefined {
  return isDateRangeValue(value) ? value : undefined
}

function formatDate(value: AnyDateValue | undefined) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(props.locale, { dateStyle: 'medium' }).format(
    toDate(value, getLocalTimeZone()),
  )
}

function formatValue(value: FormDateValue | undefined) {
  if (!value) {
    return props.placeholder
  }

  if (isDateRangeValue(value)) {
    const start = formatDate(value.start)
    const end = formatDate(value.end)
    return start && end ? `${start} - ${end}` : start || props.placeholder
  }

  return formatDate(value)
}

function toggleOpen() {
  if (props.disabled) {
    return
  }

  isOpen.value = !isOpen.value
}

function updateStandaloneSingleValue(value: AnyDateValue | undefined) {
  emit('update:modelValue', value ?? null)

  if (value) {
    isOpen.value = false
  }
}

function updateStandaloneRangeValue(value: DateRange) {
  emit('update:modelValue', value)

  if (value.start && value.end) {
    isOpen.value = false
  }
}

function updateFieldSingleValue(
  value: AnyDateValue | undefined,
  setValue: (value: DateValue | null) => void,
) {
  setValue((value as DateValue | undefined) ?? null)

  if (value) {
    isOpen.value = false
  }
}

function updateFieldRangeValue(value: DateRange, setValue: (value: DateRange | null) => void) {
  setValue(value)

  if (value.start && value.end) {
    isOpen.value = false
  }
}
</script>

<template>
  <FormField v-if="name" v-slot="{ value, setValue }" :name="name">
    <FormFieldLayout :class="props.class" :description="description" :label="label" vee>
      <div ref="rootRef" class="relative">
        <Button
          type="button"
          variant="outline"
          class="w-full justify-between"
          :disabled="disabled"
          @click="toggleOpen"
        >
          <span class="flex items-center gap-2 truncate">
            <CalendarDays class="size-4" />
            <span :class="cn(!value && 'text-muted-foreground')">{{
              formatValue(value as FormDateValue)
            }}</span>
          </span>
        </Button>

        <div
          v-if="isOpen"
          class="bg-popover absolute top-full left-0 z-50 mt-2 rounded-xl border p-3 shadow-md"
        >
          <Calendar
            v-if="!range"
            :class="calendarClass"
            :locale="locale"
            :model-value="normalizeSingleValue(value)"
            :number-of-months="calendarMonths"
            @update:model-value="(nextValue) => updateFieldSingleValue(nextValue, setValue)"
          />

          <RangeCalendar
            v-else
            :class="calendarClass"
            :locale="locale"
            :model-value="normalizeRangeValue(value)"
            :number-of-months="calendarMonths"
            @update:model-value="(nextValue) => updateFieldRangeValue(nextValue, setValue)"
          />
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
        class="w-full justify-between"
        :disabled="disabled"
        @click="toggleOpen"
      >
        <span class="flex items-center gap-2 truncate">
          <CalendarDays class="size-4" />
          <span :class="cn(!modelValue && 'text-muted-foreground')">{{
            formatValue(modelValue as FormDateValue)
          }}</span>
        </span>
      </Button>

      <div
        v-if="isOpen"
        class="bg-popover absolute top-full left-0 z-50 mt-2 rounded-xl border p-3 shadow-md"
      >
        <Calendar
          v-if="!range"
          :class="calendarClass"
          :default-value="normalizeSingleValue(defaultValue)"
          :locale="locale"
          :model-value="normalizeSingleValue(modelValue)"
          :number-of-months="calendarMonths"
          @update:model-value="updateStandaloneSingleValue"
        />

        <RangeCalendar
          v-else
          :class="calendarClass"
          :default-value="normalizeRangeValue(defaultValue)"
          :locale="locale"
          :model-value="normalizeRangeValue(modelValue)"
          :number-of-months="calendarMonths"
          @update:model-value="updateStandaloneRangeValue"
        />
      </div>
    </div>
  </FormFieldLayout>
</template>
