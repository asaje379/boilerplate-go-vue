export const home = {
  sectionTitle: 'Already wired in',
  sectionDescription:
    'Preferences are stored client-side, applied to the document, and exposed through reusable shadcn UI controls.',
  cards: {
    theme: {
      badge: 'Dark mode',
      title: 'Persistent theming',
      description:
        'Light, dark, and system preferences are remembered and applied as soon as the app boots.',
    },
    i18n: {
      badge: 'i18n',
      title: 'Centralized translations',
      description:
        'FR/EN content now flows through vue-i18n with one shared locale across the interface.',
    },
    ui: {
      badge: 'shadcn-vue',
      title: 'Composable UI primitives',
      description:
        'The demo screen uses your existing UI primitives so it can become the base for future admin screens.',
    },
  },
  checklistTitle: 'Starter capabilities',
  checklist: {
    item1: 'Theme state stored in localStorage with system mode support.',
    item2: 'Locale synced with the document lang attribute.',
    item3: 'Translated baseline navigation to kick off the rest of the admin boilerplate.',
  },
}
