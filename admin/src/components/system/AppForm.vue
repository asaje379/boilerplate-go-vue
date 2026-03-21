<script setup lang="ts">
import { Form } from '@/components/ui/form'

defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <Form v-slot="slotProps" v-bind="$attrs">
    <slot v-bind="slotProps" />
  </Form>
</template>
