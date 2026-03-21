import { computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { usePreferredDark, useStorage } from '@vueuse/core'
import { i18n, supportedLocales, type AppLocale } from '@/lib/i18n'
import { withAppPrefix } from '@/lib/utils'
import { DEFAULT_LOCALE, DEFAULT_THEME } from '@/config/constants'

export const themeOptions = ['light', 'dark', 'system'] as const

export type ThemePreference = (typeof themeOptions)[number]

const THEME_STORAGE_KEY = withAppPrefix('theme')
const LOCALE_STORAGE_KEY = withAppPrefix('locale')

function isSupportedLocale(locale: string | null): locale is AppLocale {
  return locale !== null && supportedLocales.includes(locale as AppLocale)
}

export const usePreferencesStore = defineStore('preferences', () => {
  const preferredDark = usePreferredDark()
  const themePreference = useStorage<ThemePreference>(THEME_STORAGE_KEY, DEFAULT_THEME)
  const locale = useStorage<AppLocale>(LOCALE_STORAGE_KEY, DEFAULT_LOCALE)

  const resolvedTheme = computed<Exclude<ThemePreference, 'system'>>(() => {
    if (themePreference.value === 'system') {
      return preferredDark.value ? 'dark' : 'light'
    }

    return themePreference.value
  })

  function setTheme(theme: ThemePreference) {
    themePreference.value = theme
  }

  function setLocale(value: AppLocale) {
    locale.value = value
  }

  function initialize() {
    if (!isSupportedLocale(locale.value)) {
      locale.value = 'fr'
    }

    watch(
      [resolvedTheme, locale],
      ([theme, currentLocale]) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark')
          document.documentElement.style.colorScheme = theme
          document.documentElement.lang = currentLocale
        }

        i18n.global.locale.value = currentLocale
      },
      { immediate: true },
    )
  }

  return {
    initialize,
    locale,
    preferredDark,
    resolvedTheme,
    setLocale,
    setTheme,
    themePreference,
  }
})
