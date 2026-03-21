<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Languages, MoonStar, PanelsTopLeft } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const { t } = useI18n()

const featureCards = computed(() => [
  {
    badge: t('home.cards.theme.badge'),
    title: t('home.cards.theme.title'),
    description: t('home.cards.theme.description'),
    icon: MoonStar,
  },
  {
    badge: t('home.cards.i18n.badge'),
    title: t('home.cards.i18n.title'),
    description: t('home.cards.i18n.description'),
    icon: Languages,
  },
  {
    badge: t('home.cards.ui.badge'),
    title: t('home.cards.ui.title'),
    description: t('home.cards.ui.description'),
    icon: PanelsTopLeft,
  },
])

const checklist = computed(() => [
  t('home.checklist.item1'),
  t('home.checklist.item2'),
  t('home.checklist.item3'),
])
</script>

<template>
  <section class="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
    <Card class="overflow-hidden border-border/60 bg-card/90">
      <CardHeader class="gap-4">
        <Badge
          variant="outline"
          class="w-fit rounded-full px-3 py-1 text-xs tracking-[0.2em] uppercase"
        >
          {{ t('hero.eyebrow') }}
        </Badge>
        <div class="space-y-3">
          <CardTitle class="max-w-3xl text-3xl leading-tight sm:text-4xl lg:text-5xl">
            {{ t('hero.title') }}
          </CardTitle>
          <CardDescription class="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {{ t('hero.description') }}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent class="flex flex-col gap-4 sm:flex-row">
        <Button as-child size="lg" class="rounded-full">
          <RouterLink to="/about">
            {{ t('hero.primaryCta') }}
            <ArrowRight class="size-4" />
          </RouterLink>
        </Button>

        <Button as-child variant="outline" size="lg" class="rounded-full">
          <a href="#starter-capabilities">{{ t('hero.secondaryCta') }}</a>
        </Button>
      </CardContent>
    </Card>

    <Card id="starter-capabilities" class="border-border/60 bg-card/85">
      <CardHeader>
        <CardTitle>{{ t('home.checklistTitle') }}</CardTitle>
        <CardDescription>{{ t('home.sectionDescription') }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          v-for="item in checklist"
          :key="item"
          class="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4"
        >
          <span class="mt-1 size-2 rounded-full bg-primary" />
          <p class="text-sm leading-6 text-muted-foreground">{{ item }}</p>
        </div>
      </CardContent>
    </Card>
  </section>

  <section class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <Card
      v-for="feature in featureCards"
      :key="feature.title"
      class="border-border/60 bg-card/85 transition-colors hover:border-primary/30"
    >
      <CardHeader class="space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div
            class="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"
          >
            <component :is="feature.icon" class="size-5" />
          </div>
          <Badge variant="secondary">{{ feature.badge }}</Badge>
        </div>
        <div class="space-y-2">
          <CardTitle class="text-xl">{{ feature.title }}</CardTitle>
          <CardDescription class="leading-6">{{ feature.description }}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  </section>
</template>
