<script setup lang="ts">
import { computed } from 'vue'
import { FolderCog, Languages, MoonStar } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const { t } = useI18n()

const blocks = computed(() => [
  {
    title: t('about.blocks.i18n.title'),
    description: t('about.blocks.i18n.description'),
    icon: Languages,
  },
  {
    title: t('about.blocks.theme.title'),
    description: t('about.blocks.theme.description'),
    icon: MoonStar,
  },
  {
    title: t('about.blocks.layout.title'),
    description: t('about.blocks.layout.description'),
    icon: FolderCog,
  },
])
</script>

<template>
  <section class="space-y-6">
    <Card class="border-border/60 bg-card/90">
      <CardHeader class="max-w-3xl space-y-3">
        <CardTitle class="text-3xl leading-tight sm:text-4xl">{{ t('about.title') }}</CardTitle>
        <CardDescription class="text-base leading-7">{{ t('about.description') }}</CardDescription>
      </CardHeader>
    </Card>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card v-for="block in blocks" :key="block.title" class="border-border/60 bg-card/85">
        <CardHeader class="space-y-4">
          <div
            class="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"
          >
            <component :is="block.icon" class="size-5" />
          </div>
          <div class="space-y-2">
            <CardTitle class="text-xl">{{ block.title }}</CardTitle>
            <CardDescription class="leading-6">{{ block.description }}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  </section>
</template>
