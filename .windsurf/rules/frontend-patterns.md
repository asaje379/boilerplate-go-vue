---
trigger: glob
globs: admin/src/**/*
---

# Frontend Admin Patterns

- Keep raw transport logic inside `services/http` and domain calls inside `services/api`
- Do not issue direct network calls from views or purely presentational components
- Reuse existing `stores/session`, router guards, and `components/system` patterns before adding new state layers
- Keep `components/ui` for reusable visual primitives and `components/system` for application-level compositions
- Preserve Vue 3 composition patterns, Pinia store boundaries, and existing route meta conventions

## UX and data handling

- Handle loading, empty, error, and submitting states intentionally
- Keep DTO and mapping logic out of templates when possible
- Respect i18n usage and avoid scattering hardcoded user-facing strings
- Favor accessible semantics, visible focus states, and keyboard-usable flows

## Validation

- Use the smallest relevant check from `pnpm lint`, `pnpm build`, `pnpm test:unit`, and `pnpm test:e2e`
