<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { FormField } from '@/components/ui/form'
import FormFieldLayout from './FormFieldLayout.vue'
import RichTextEditorCore from './RichTextEditorCore.vue'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    description?: string
    disabled?: boolean
    error?: string
    label?: string
    minHeightClass?: string
    modelValue?: string
    name?: string
    placeholder?: string
  }>(),
  {
    modelValue: '',
    placeholder: 'Start writing...',
  },
)

const emit = defineEmits<{
  'update:modelValue': [payload: string]
}>()
</script>

<template>
  <FormField v-if="name" v-slot="{ componentField }" :name="name">
    <FormFieldLayout :class="props.class" :description="description" :label="label" vee>
      <RichTextEditorCore
        :disabled="disabled"
        :min-height-class="minHeightClass"
        :model-value="
          typeof componentField.modelValue === 'string' ? componentField.modelValue : ''
        "
        :placeholder="placeholder"
        @update:model-value="componentField['onUpdate:modelValue']"
      />
    </FormFieldLayout>
  </FormField>

  <FormFieldLayout
    v-else
    :class="props.class"
    :description="description"
    :error="error"
    :label="label"
  >
    <RichTextEditorCore
      :disabled="disabled"
      :min-height-class="minHeightClass"
      :model-value="modelValue"
      :placeholder="placeholder"
      @update:model-value="(value) => emit('update:modelValue', value)"
    />
  </FormFieldLayout>
</template>
