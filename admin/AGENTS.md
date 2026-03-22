# Admin Frontend Conventions

Vue 3 + TypeScript + Vite SPA with Tailwind v4 + shadcn-vue.

## Architecture layers

```
src/
  services/http/    → transport (client, errors, session)
  services/api/     → domain API modules (auth, users, files)
  stores/           → Pinia stores (session, preferences, realtime)
  views/            → page-level components
  components/ui/    → shadcn-vue primitives
  components/system/→ app-shell components (AppLayout, AppUserMenu…)
  composables/      → shared composition functions
  locales/          → i18n locale files (en/, fr/)
  lib/              → utilities (i18n setup, utils)
```

## Rules

- Views call API modules or stores, never raw HTTP client
- Forms use VeeValidate + Zod schemas; validation messages go through `vue-i18n`
- Toast feedback via `vue-sonner` — always use `t()` for messages
- All user-facing strings must use `$t()` / `t()` — no hardcoded text
- Component props use TypeScript interfaces; prefer `defineProps<T>()`
- Use `components/ui/` primitives; do not introduce competing UI libraries
- Imports at top of file; no barrel re-exports from views

## Styling

- Tailwind v4 utility classes; no inline `style` attributes
- Color tokens: `primary`, `muted`, `destructive`, `warning`, `success`
- Dark mode via CSS class strategy (`dark:` variants)
- Responsive: mobile-first, test at 375px and 1280px breakpoints

## Testing

- Unit tests with Vitest; component tests with `@vue/test-utils`
- E2E tests with Playwright in `e2e/` directory
