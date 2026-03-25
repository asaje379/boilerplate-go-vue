<script setup lang="ts">
import AppForm from "@/components/system/AppForm.vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const props = defineProps<{
  description: string;
  initialValues: Record<string, unknown>;
  open: boolean;
  title: string;
  validationSchema: unknown;
}>();

const emit = defineEmits<{
  "invalid-submit": [payload: unknown];
  submit: [payload: unknown];
  "update:open": [value: boolean];
}>();

function handleInvalidSubmit(payload: unknown) {
  emit("invalid-submit", payload);
}

function handleSubmit(payload: unknown) {
  emit("submit", payload);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(value) => emit('update:open', value)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>

      <AppForm
        :initial-values="initialValues"
        :validation-schema="validationSchema"
        @invalid-submit="handleInvalidSubmit"
        @submit="handleSubmit"
      >
        <template #default="slotProps">
          <slot v-bind="slotProps" />
        </template>
      </AppForm>
    </DialogContent>
  </Dialog>
</template>
