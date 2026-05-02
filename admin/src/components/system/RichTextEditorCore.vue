<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import {
  Bold,
  FileCode,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    disabled?: boolean;
    format?: "html" | "markdown";
    minHeightClass?: string;
    modelValue?: string;
    placeholder?: string;
  }>(),
  {
    format: "html",
    minHeightClass: "min-h-56",
    modelValue: "",
    placeholder: "Start writing...",
  },
);

const emit = defineEmits<{
  "update:modelValue": [payload: string];
}>();

const imageUrl = ref("");
const showImageInput = ref(false);
const isMarkdownMode = ref(props.format === "markdown");

const editor = useEditor({
  content: props.modelValue,
  contentType: props.format,
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: cn(
        "prose prose-sm dark:prose-invert max-w-none px-4 py-3 outline-none",
        props.minHeightClass,
      ),
    },
  },
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Markdown,
  ],
  onUpdate: ({ editor }) => {
    const content = isMarkdownMode.value
      ? editor.getMarkdown()
      : editor.getHTML();
    emit("update:modelValue", content);
  },
});

const toolbar = computed(() => [
  {
    action: () => editor.value?.chain().focus().toggleBold().run(),
    active: () => editor.value?.isActive("bold"),
    icon: Bold,
    label: "Bold",
  },
  {
    action: () => editor.value?.chain().focus().toggleItalic().run(),
    active: () => editor.value?.isActive("italic"),
    icon: Italic,
    label: "Italic",
  },
  {
    action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run(),
    active: () => editor.value?.isActive("heading", { level: 1 }),
    icon: Heading1,
    label: "Heading 1",
  },
  {
    action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(),
    active: () => editor.value?.isActive("heading", { level: 2 }),
    icon: Heading2,
    label: "Heading 2",
  },
  {
    action: () => editor.value?.chain().focus().toggleBulletList().run(),
    active: () => editor.value?.isActive("bulletList"),
    icon: List,
    label: "Bullet list",
  },
  {
    action: () => editor.value?.chain().focus().toggleOrderedList().run(),
    active: () => editor.value?.isActive("orderedList"),
    icon: ListOrdered,
    label: "Ordered list",
  },
  {
    action: () => editor.value?.chain().focus().toggleBlockquote().run(),
    active: () => editor.value?.isActive("blockquote"),
    icon: Quote,
    label: "Quote",
  },
]);

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) {
      return;
    }

    const currentValue = isMarkdownMode.value ? editor.value.getMarkdown() : editor.value.getHTML();

    if (value !== currentValue) {
      editor.value.commands.setContent(value || "", {
        emitUpdate: false,
        contentType: isMarkdownMode.value ? "markdown" : "html",
      });
    }
  },
);

watch(
  () => props.disabled,
  (value) => {
    editor.value?.setEditable(!value);
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});

function toggleImageInput() {
  showImageInput.value = !showImageInput.value;

  if (!showImageInput.value) {
    imageUrl.value = "";
  }
}

function insertImage() {
  const src = imageUrl.value.trim();

  if (!src || !editor.value) {
    return;
  }

  editor.value.chain().focus().setImage({ src }).run();
  imageUrl.value = "";
  showImageInput.value = false;
}

function toggleFormat() {
  if (!editor.value) return;

  isMarkdownMode.value = !isMarkdownMode.value;

  // Convertir le contenu au nouveau format
  if (isMarkdownMode.value) {
    // Passer en mode markdown
    emit("update:modelValue", editor.value.getMarkdown());
  } else {
    // Passer en mode HTML
    emit("update:modelValue", editor.value.getHTML());
  }
}
</script>

<template>
  <div
    :class="cn('overflow-hidden rounded-2xl border border-border/70 bg-background', props.class)"
  >
    <div class="flex flex-wrap gap-2 border-b border-border/70 bg-muted/30 p-3">
      <Button
        v-for="item in toolbar"
        :key="item.label"
        type="button"
        size="icon-sm"
        :variant="item.active() ? 'secondary' : 'ghost'"
        :disabled="disabled"
        @click="item.action"
      >
        <component :is="item.icon" class="size-4" />
        <span class="sr-only">{{ item.label }}</span>
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        :disabled="disabled"
        @click="toggleImageInput"
      >
        <ImagePlus class="size-4" />
        <span class="sr-only">Insert image URL</span>
      </Button>

      <div class="ml-auto flex gap-2">
        <Button type="button" size="sm" variant="ghost" :disabled="disabled" @click="toggleFormat">
          <FileCode class="size-4 mr-1" />
          <span>{{ isMarkdownMode ? "Markdown" : "HTML" }}</span>
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          :disabled="disabled"
          @click="editor?.chain().focus().undo().run()"
        >
          <Undo2 class="size-4" />
          <span class="sr-only">Undo</span>
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          :disabled="disabled"
          @click="editor?.chain().focus().redo().run()"
        >
          <Redo2 class="size-4" />
          <span class="sr-only">Redo</span>
        </Button>
      </div>
    </div>

    <div
      v-if="showImageInput"
      class="flex flex-col gap-2 border-b border-border/70 bg-muted/20 p-3 sm:flex-row"
    >
      <Input v-model="imageUrl" placeholder="https://example.com/image.jpg" :disabled="disabled" />
      <Button type="button" :disabled="disabled || !imageUrl.trim()" @click="insertImage"
        >Insert image</Button
      >
    </div>

    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: color-mix(in oklab, var(--muted-foreground) 80%, transparent);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.ProseMirror h1) {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

:deep(.ProseMirror h2) {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1.25rem;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid var(--border);
  color: var(--muted-foreground);
  margin: 1rem 0;
  padding-left: 1rem;
}

:deep(.ProseMirror img) {
  border-radius: 1rem;
  margin: 1rem 0;
  max-width: 100%;
}
</style>
