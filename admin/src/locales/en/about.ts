export const about = {
  title: 'A simple structure that keeps the admin easy to scale.',
  description:
    'Cross-cutting setup lives in dedicated files so product screens stay focused on business features.',
  blocks: {
    i18n: {
      title: 'Internationalization',
      description:
        '`src/lib/i18n.ts` centralizes messages, the default locale, and the list of supported languages.',
    },
    theme: {
      title: 'Theme',
      description:
        '`src/composables/use-theme.ts` manages user preference, system mode resolution, and the document `dark` class.',
    },
    layout: {
      title: 'Layout',
      description:
        '`src/App.vue` owns the main shell while the views stay focused on product content.',
    },
  },
}
