---
trigger: glob
globs: admin/**/*.vue, admin/**/*.ts
---

# Vue / TypeScript Conventions

- All user-facing strings must use `$t()` or `t()` from vue-i18n — no hardcoded text
- Forms use VeeValidate with `toTypedSchema(z.object({...}))` — validation messages via i18n
- Toast feedback via `vue-sonner` — always pass translated strings
- Views call API modules (`services/api/`) or Pinia stores, never the raw HTTP client
- Component props typed with `defineProps<T>()` — no runtime prop validation
- Use `<script setup lang="ts">` for all SFCs
- Imports at the top of `<script setup>` block; group: vue → libraries → local
- Use shadcn-vue primitives from `components/ui/`; do not add competing UI libraries
- Autocomplete attributes required on all login/password form fields
- Route definitions must include `meta.title` for document title
