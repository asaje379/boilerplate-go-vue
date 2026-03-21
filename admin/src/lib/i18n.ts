import { createI18n } from 'vue-i18n'
import { en } from '@/locales/en'
import { fr } from '@/locales/fr'

export const supportedLocales = ['fr', 'en'] as const

export type AppLocale = (typeof supportedLocales)[number]

export const messages = {
  en,
  fr,
} as const

export const i18n = createI18n({
  legacy: false,
  fallbackLocale: 'en',
  locale: 'fr',
  messages,
})
