---
name: add-admin-feature
description: Add or extend an admin feature in the Vue app by wiring routes, views, API modules, store usage, and UX states in a way that matches the repository conventions.
---

## When to use

Invoke this skill when adding a new page, view, or feature to the `admin/` Vue frontend.

## Step-by-step checklist

### 1. API module (`src/services/api/`)
- Create or update `<domain>.api.ts`
- Define TypeScript request/response interfaces matching the API DTOs
- Use `apiRequest()` from `services/http/client.ts` — never raw fetch
- See [api-module-template.md](./api-module-template.md) for the pattern

### 2. Pinia store (if shared state needed)
- Create `src/stores/<domain>.ts`
- Use `defineStore` with composition API style
- Call API module functions, not raw HTTP
- Expose reactive state + actions

### 3. View (`src/views/`)
- Create `<Feature>View.vue` with `<script setup lang="ts">`
- Use VeeValidate + Zod for form validation
- All user-facing strings via `$t()` / `t()`
- Handle loading, empty, and error states
- Use shadcn-vue primitives from `components/ui/`

### 4. Route (`src/router/index.ts`)
- Add route with `meta: { requiresAuth: true, title: '...' }`
- Title used for document title via `afterEach` hook

### 5. i18n (`src/locales/`)
- Add keys in both `en/<domain>.ts` and `fr/<domain>.ts`
- Register in `en/index.ts` and `fr/index.ts`
- Include: page title, form labels, placeholders, buttons, validation messages, toasts

### 6. Navigation (if top-level page)
- Add entry in `App.vue` navigation computed array
- Choose an icon from `lucide-vue-next`

## Post-implementation
- Verify all strings are translated (no hardcoded text in template)
- Check autocomplete attributes on login/password fields
- Confirm route title appears in browser tab
