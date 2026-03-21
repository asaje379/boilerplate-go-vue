<script setup lang="ts">
import type { HTMLAttributes, InputTypeHTMLAttribute } from 'vue'
import { useId } from 'reka-ui'
import { computed, useAttrs, useSlots } from 'vue'
import { cn } from '@/lib/utils'
import { FormField } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { FormInputValue as ModelValue } from '@/types/system-form'
import FormFieldLayout from './FormFieldLayout.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
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
    rows?: number
    textarea?: boolean
    type?: InputTypeHTMLAttribute
  }>(),
  {
    rows: 4,
    textarea: false,
    type: 'text',
  },
)

const emit = defineEmits<{
  'update:modelValue': [payload: ModelValue]
}>()

const attrs = useAttrs()
const slots = useSlots()
const fallbackId = useId()

const inputId = computed(() => String(attrs.id ?? `${fallbackId}-input`))
const hasLeading = computed(() => Boolean(slots.leading) && !props.textarea)
const hasTrailing = computed(() => Boolean(slots.trailing) && !props.textarea)
const sharedClass = computed(() =>
  cn(hasLeading.value && 'pl-10', hasTrailing.value && 'pr-10', props.inputClass),
)

function updateValue(value: ModelValue) {
  emit('update:modelValue', value)
}
</script>

<template>
  <FormField v-if="name" v-slot="{ componentField }" :name="name">
    <FormFieldLayout :class="props.class" :description="description" :label="label" vee>
      <Textarea
        v-if="textarea"
        v-bind="{ ...attrs, ...componentField }"
        :rows="rows"
        :class="sharedClass"
        :disabled="disabled"
        :placeholder="placeholder"
      />

      <div v-else class="relative">
        <span
          v-if="hasLeading"
          class="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center"
        >
          <slot name="leading" />
        </span>

        <Input
          v-bind="{ ...attrs, ...componentField }"
          :class="sharedClass"
          :disabled="disabled"
          :placeholder="placeholder"
          :type="type"
        />

        <span
          v-if="hasTrailing"
          class="text-muted-foreground absolute inset-y-0 right-3 flex items-center"
        >
          <slot name="trailing" />
        </span>
      </div>
    </FormFieldLayout>
  </FormField>

  <FormFieldLayout
    v-else
    :class="props.class"
    :description="description"
    :error="error"
    :for-id="inputId"
    :label="label"
  >
    <Textarea
      v-if="textarea"
      :id="inputId"
      v-bind="attrs"
      :class="sharedClass"
      :default-value="defaultValue"
      :disabled="disabled"
      :model-value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      @update:model-value="updateValue"
    />

    <div v-else class="relative">
      <span
        v-if="hasLeading"
        class="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center"
      >
        <slot name="leading" />
      </span>

      <Input
        :id="inputId"
        v-bind="attrs"
        :class="sharedClass"
        :default-value="defaultValue"
        :disabled="disabled"
        :model-value="modelValue"
        :placeholder="placeholder"
        :type="type"
        @update:model-value="updateValue"
      />

      <span
        v-if="hasTrailing"
        class="text-muted-foreground absolute inset-y-0 right-3 flex items-center"
      >
        <slot name="trailing" />
      </span>
    </div>
  </FormFieldLayout>
</template>
