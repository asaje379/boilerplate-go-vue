<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { LoaderCircle, Paperclip, Trash2, UploadCloud } from "lucide-vue-next";
import { useId } from "reka-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import type { FileUploadItem, FileUploadValue } from "@/types/system-form";
import FormFieldLayout from "./FormFieldLayout.vue";

const props = withDefaults(
  defineProps<{
    accept?: string;
    buttonLabel?: string;
    class?: HTMLAttributes["class"];
    description?: string;
    disabled?: boolean;
    error?: string;
    label?: string;
    modelValue?: FileUploadValue;
    multiple?: boolean;
    name?: string;
    path?: string;
    placeholder?: string;
    upload?: (file: File, path?: string) => Promise<FileUploadItem | void>;
  }>(),
  {
    buttonLabel: "Select file",
    modelValue: null,
    multiple: false,
    placeholder: "No file selected",
  },
);

const emit = defineEmits<{
  "update:modelValue": [payload: FileUploadValue];
  uploaded: [payload: FileUploadValue];
}>();

const inputId = useId();
const inputRef = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const objectUrls = ref<string[]>([]);

const normalizedValue = computed<FileUploadItem[]>(() => {
  if (!props.modelValue) {
    return [];
  }

  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue];
});

const previewItems = computed(() =>
  normalizedValue.value.map((item, index) => {
    const name = typeof item === "string" ? item.split("/").slice(-1)[0] || item : item.name;
    const isImage = typeof item === "string" ? true : item.type.startsWith("image/");
    const previewUrl = isImage
      ? typeof item === "string"
        ? item
        : objectUrls.value[index] || null
      : null;

    return {
      isImage,
      name,
      previewUrl,
      value: item,
    };
  }),
);

const summaryText = computed(() => {
  if (!previewItems.value.length) {
    return props.placeholder;
  }

  if (previewItems.value.length === 1) {
    return previewItems.value[0]?.name || props.placeholder;
  }

  return `${previewItems.value.length} files selected`;
});

watch(
  normalizedValue,
  (value) => {
    for (const url of objectUrls.value) {
      URL.revokeObjectURL(url);
    }

    objectUrls.value = value.map((item) =>
      item instanceof File && item.type.startsWith("image/") ? URL.createObjectURL(item) : "",
    );
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  for (const url of objectUrls.value) {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
});

function normalizeExternalValue(value: unknown): FileUploadItem[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? (value as FileUploadItem[]) : [value as FileUploadItem];
}

function toOutputValue(items: FileUploadItem[]) {
  if (props.multiple) {
    return items;
  }

  return items[0] ?? null;
}

function openPicker() {
  if (props.disabled || isUploading.value) {
    return;
  }

  inputRef.value?.click();
}

async function processFiles(
  files: File[],
  currentValue: unknown,
  setValue?: (value: FileUploadValue) => void,
) {
  const assign = setValue ?? ((value: FileUploadValue) => emit("update:modelValue", value));
  const nextItems = props.multiple ? normalizeExternalValue(currentValue) : [];

  isUploading.value = true;

  try {
    for (const file of files) {
      const optimisticItems = props.multiple ? [...nextItems, file] : [file];
      assign(toOutputValue(optimisticItems));

      if (!props.upload) {
        if (props.multiple) {
          nextItems.push(file);
        } else {
          nextItems.splice(0, nextItems.length, file);
        }
        continue;
      }

      const uploadedValue = await props.upload(file, props.path);
      const finalItem = uploadedValue ?? file;

      if (props.multiple) {
        nextItems.push(finalItem);
      } else {
        nextItems.splice(0, nextItems.length, finalItem);
      }

      assign(toOutputValue(nextItems));
    }

    emit("uploaded", toOutputValue(nextItems));
  } finally {
    isUploading.value = false;
  }
}

async function handleChange(
  event: Event,
  currentValue: unknown,
  setValue?: (value: FileUploadValue) => void,
) {
  const target = event.target as HTMLInputElement | null;
  const files = target?.files ? Array.from(target.files) : [];

  if (!files.length) {
    return;
  }

  await processFiles(files, currentValue, setValue);

  if (target) {
    target.value = "";
  }
}

function clearValue(setValue?: (value: FileUploadValue) => void) {
  const assign = setValue ?? ((value: FileUploadValue) => emit("update:modelValue", value));
  assign(props.multiple ? [] : null);
}

function removeItem(
  itemToRemove: FileUploadItem,
  currentValue: unknown,
  setValue?: (value: FileUploadValue) => void,
) {
  const assign = setValue ?? ((value: FileUploadValue) => emit("update:modelValue", value));
  const filtered = normalizeExternalValue(currentValue).filter((item) => item !== itemToRemove);
  assign(toOutputValue(filtered));
}
</script>

<template>
  <FormField v-if="name" v-slot="{ value, setValue }" :name="name">
    <FormFieldLayout :class="props.class" :description="description" :label="label" vee>
      <div class="space-y-3">
        <input
          :id="inputId"
          ref="inputRef"
          :accept="accept"
          class="hidden"
          type="file"
          :multiple="multiple"
          @change="(event) => handleChange(event, value, setValue)"
        />

        <div class="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4">
          <div
            v-if="previewItems.some((item) => item.previewUrl)"
            class="mb-4 grid gap-3 sm:grid-cols-2"
          >
            <div
              v-for="item in previewItems.filter((preview) => preview.previewUrl)"
              :key="`${item.name}-${item.previewUrl}`"
              class="overflow-hidden rounded-xl border border-border/60 bg-muted/30"
            >
              <img
                :src="item.previewUrl || undefined"
                :alt="item.name"
                class="h-40 w-full object-cover"
              />
            </div>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2">
                <Badge variant="outline">{{ multiple ? "Uploads" : "Upload" }}</Badge>
                <p class="truncate text-sm font-medium">{{ summaryText }}</p>
              </div>
              <p class="text-muted-foreground text-sm">
                {{
                  isUploading
                    ? "Uploading file..."
                    : "Choose file" + (multiple ? "s" : "") + " and preview before continuing."
                }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                :loading="isUploading"
                :disabled="disabled"
                @click="openPicker"
              >
                <UploadCloud class="size-4" />
                {{ buttonLabel }}
              </Button>
              <Button
                v-if="normalizeExternalValue(value).length"
                type="button"
                variant="ghost"
                :disabled="isUploading"
                @click="clearValue(setValue)"
              >
                <Trash2 class="size-4" />
                Clear all
              </Button>
            </div>
          </div>

          <div v-if="normalizeExternalValue(value).length" class="mt-4 space-y-2">
            <div
              v-for="item in previewItems"
              :key="`${item.name}-${typeof item.value === 'string' ? item.value : item.name}`"
              class="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
            >
              <Paperclip class="text-muted-foreground size-4" />
              <span class="truncate">{{ item.name }}</span>
              <LoaderCircle v-if="isUploading" class="ml-auto size-4 animate-spin" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="ml-auto size-7"
                :disabled="isUploading"
                @click="removeItem(item.value, value, setValue)"
              >
                <Trash2 class="size-3.5" />
                <span class="sr-only">Remove file</span>
              </Button>
            </div>
          </div>
        </div>
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
    <div class="space-y-3">
      <input
        :id="inputId"
        ref="inputRef"
        :accept="accept"
        class="hidden"
        type="file"
        :multiple="multiple"
        @change="(event) => handleChange(event, modelValue)"
      />

      <div class="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4">
        <div
          v-if="previewItems.some((item) => item.previewUrl)"
          class="mb-4 grid gap-3 sm:grid-cols-2"
        >
          <div
            v-for="item in previewItems.filter((preview) => preview.previewUrl)"
            :key="`${item.name}-${item.previewUrl}`"
            class="overflow-hidden rounded-xl border border-border/60 bg-muted/30"
          >
            <img
              :src="item.previewUrl || undefined"
              :alt="item.name"
              class="h-40 w-full object-cover"
            />
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0 space-y-1">
            <div class="flex items-center gap-2">
              <Badge variant="outline">{{ multiple ? "Uploads" : "Upload" }}</Badge>
              <p class="truncate text-sm font-medium">{{ summaryText }}</p>
            </div>
            <p class="text-muted-foreground text-sm">
              {{
                isUploading
                  ? "Uploading file..."
                  : "Choose file" + (multiple ? "s" : "") + " and preview before continuing."
              }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              :loading="isUploading"
              :disabled="disabled"
              @click="openPicker"
            >
              <UploadCloud class="size-4" />
              {{ buttonLabel }}
            </Button>
            <Button
              v-if="normalizedValue.length"
              type="button"
              variant="ghost"
              :disabled="isUploading"
              @click="clearValue()"
            >
              <Trash2 class="size-4" />
              Clear all
            </Button>
          </div>
        </div>

        <div v-if="normalizedValue.length" class="mt-4 space-y-2">
          <div
            v-for="item in previewItems"
            :key="`${item.name}-${typeof item.value === 'string' ? item.value : item.name}`"
            class="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
          >
            <Paperclip class="text-muted-foreground size-4" />
            <span class="truncate">{{ item.name }}</span>
            <LoaderCircle v-if="isUploading" class="ml-auto size-4 animate-spin" />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              class="ml-auto size-7"
              :disabled="isUploading"
              @click="removeItem(item.value, modelValue)"
            >
              <Trash2 class="size-3.5" />
              <span class="sr-only">Remove file</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </FormFieldLayout>
</template>
