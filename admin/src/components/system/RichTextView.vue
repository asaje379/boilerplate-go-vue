<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
  content: string;
  format?: "html" | "markdown" | "auto";
}

const props = withDefaults(defineProps<Props>(), {
  format: "auto",
});

/**
 * Détecte si le contenu est du Markdown ou de l'HTML
 * Heuristique simple : présence de balises HTML = HTML, sinon Markdown
 */
function detectFormat(content: string): "html" | "markdown" {
  const htmlTagPattern = /<\/?[a-zA-Z][^>]*>/;
  return htmlTagPattern.test(content) ? "html" : "markdown";
}

/**
 * Convertit le Markdown en HTML (conversion simple)
 * Pour une conversion complète, utiliser une lib comme marked
 */
function markdownToHtml(markdown: string): string {
  return (
    markdown
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      // Blockquotes
      .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")
      // Lists
      .replace(/^- (.*$)/gim, "<ul><li>$1</li></ul>")
      .replace(/^\d+\. (.*$)/gim, "<ol><li>$1</li></ol>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Line breaks
      .replace(/\n/gim, "<br />")
      // Consolidate lists
      .replace(/<\/ul>\s*<ul>/g, "")
      .replace(/<\/ol>\s*<ol>/g, "")
  );
}

/**
 * Rend le contenu en fonction du format détecté ou spécifié
 */
const renderedContent = computed(() => {
  const effectiveFormat = props.format === "auto" ? detectFormat(props.content) : props.format;

  if (effectiveFormat === "markdown") {
    return DOMPurify.sanitize(markdownToHtml(props.content));
  }

  return DOMPurify.sanitize(props.content);
});
</script>

<script lang="ts">
import { computed } from "vue";
</script>

<template>
  <div
    :class="cn('prose prose-sm dark:prose-invert max-w-none break-words', props.class)"
    v-html="renderedContent"
  />
</template>

<style scoped>
:deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.5rem;
}

:deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 0.5rem;
}

:deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

:deep(p) {
  margin-bottom: 0.75rem;
}

:deep(ul),
:deep(ol) {
  padding-left: 1.25rem;
  margin-bottom: 0.75rem;
}

:deep(li) {
  margin-bottom: 0.25rem;
}

:deep(blockquote) {
  border-left: 3px solid var(--border);
  color: var(--muted-foreground);
  margin: 1rem 0;
  padding-left: 1rem;
  font-style: italic;
}

:deep(a) {
  color: var(--primary);
  text-decoration: underline;
}

:deep(a:hover) {
  text-decoration: none;
}

:deep(img) {
  border-radius: 0.5rem;
  margin: 1rem 0;
  max-width: 100%;
  height: auto;
}

:deep(strong) {
  font-weight: 700;
}

:deep(em) {
  font-style: italic;
}

:deep(br) {
  display: block;
  content: "";
  margin-bottom: 0.5rem;
}
</style>
