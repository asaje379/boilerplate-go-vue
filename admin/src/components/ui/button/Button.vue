<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { ButtonVariants } from ".";
import { LoaderCircle } from "lucide-vue-next";
import { Primitive } from "reka-ui";
import { computed, ref, useAttrs } from "vue";
import { cn } from "@/lib/utils";
import { buttonVariants } from ".";

defineOptions({
  inheritAttrs: false,
});

interface Props extends PrimitiveProps {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  class?: HTMLAttributes["class"];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
  loading: false,
});

const attrs = useAttrs();
const internalLoading = ref(false);

const forwardedAttrs = computed(() => {
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== "disabled" && key !== "onClick"),
  );
});

const isLoading = computed(() => props.loading || internalLoading.value);

const isDisabled = computed(() => {
  const disabledAttr = attrs.disabled;

  return disabledAttr === "" || disabledAttr === true || disabledAttr === "true" || isLoading.value;
});

function blockInteraction(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === "object" && value !== null && "then" in value;
}

function normalizeClickListeners() {
  const clickListener = attrs.onClick;

  if (!clickListener) {
    return [] as Array<(event: MouseEvent) => unknown>;
  }

  return (Array.isArray(clickListener) ? clickListener : [clickListener]) as Array<
    (event: MouseEvent) => unknown
  >;
}

async function handleClick(event: MouseEvent) {
  if (isDisabled.value) {
    blockInteraction(event);
    return;
  }

  const listeners = normalizeClickListeners();

  if (!listeners.length) {
    return;
  }

  const results = listeners.map((listener) => listener(event));
  const pendingTasks = results.filter(isPromiseLike);

  if (!pendingTasks.length) {
    return;
  }

  internalLoading.value = true;

  try {
    await Promise.all(pendingTasks);
  } finally {
    internalLoading.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!isDisabled.value) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    blockInteraction(event);
  }
}
</script>

<template>
  <Primitive
    v-bind="forwardedAttrs"
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :aria-busy="isLoading || undefined"
    :aria-disabled="isDisabled || undefined"
    :tabindex="isDisabled && as !== 'button' ? -1 : undefined"
    :disabled="as === 'button' ? isDisabled : undefined"
    :class="
      cn(buttonVariants({ variant, size }), 'relative', isLoading && 'cursor-wait', props.class)
    "
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <LoaderCircle class="size-4 animate-spin" />
    </span>

    <span :class="cn('inline-flex items-center justify-center gap-2', isLoading && 'opacity-0')">
      <slot />
    </span>
  </Primitive>
</template>
