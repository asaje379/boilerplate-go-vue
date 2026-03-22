# Opus Review Report — Boilerplate Go + Vue

> Full architecture, security, code quality, and UI/UX review.
> Generated after deep analysis of every service, Playwright UI testing, and codebase exploration.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Backend Review (Go)](#backend-review-go)
  - [Security](#security)
  - [Code Quality](#code-quality)
  - [Missing Pieces](#missing-pieces)
- [Frontend Review (Vue 3)](#frontend-review-vue-3)
  - [Architecture](#frontend-architecture)
  - [Issues](#frontend-issues)
- [UI/UX Review (Playwright)](#uiux-review-playwright)
  - [Login Page](#login-page)
  - [Responsiveness](#responsiveness)
  - [Recommendations for a Modern &amp; Fluid UI](#recommendations-for-a-modern--fluid-ui)
- [Priority Matrix](#priority-matrix)
- [Conclusion](#conclusion)

---

## Project Overview

A **production-grade fullstack boilerplate** for building admin panels, composed of **3 services**:

| Service             | Stack                                                                                                                      | Role                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `api/`              | Go · Gin · GORM · Postgres · JWT · RabbitMQ · S3/MinIO                                                                     | REST API, auth, file management, async email               |
| `realtime-gateway/` | Go · Gin · Gorilla WebSocket · RabbitMQ                                                                                    | Bridges domain events to the frontend via SSE or WebSocket |
| `admin/`            | Vue 3 · TypeScript · Vite · Tailwind v4 · shadcn-vue · Pinia · vue-router · vue-i18n · vee-validate · Zod · TanStack Table | SPA admin panel                                            |

**Key features out of the box:**

- JWT access + refresh token authentication
- Two-factor authentication (email OTP)
- Role-based access control (admin / user)
- Password reset flow (backend-ready)
- File upload with S3/MinIO signed URLs
- Real-time presence & domain events (SSE + WebSocket)
- Internationalization (fr / en)
- Dark mode support
- Swagger API documentation
- Database auto-creation & SQL migrations
- Seeder with configurable default users
- Disposable email blocklist validation

---

## Architecture

The backend follows **clean / hexagonal architecture**:

```
api/internal/
├── domain/           # Pure Go structs, repository interfaces (no framework deps)
│   ├── auth/
│   ├── file/
│   └── user/
├── application/      # Business logic services
│   ├── auth/
│   ├── common/
│   ├── file/
│   └── user/
├── infrastructure/   # Repository implementations (Postgres/GORM, S3)
│   └── persistence/postgres/
├── interfaces/       # HTTP handlers, middleware, router
│   └── http/
├── platform/         # Cross-cutting: config, mailer, migrations, RabbitMQ, seeder
│   ├── async/
│   ├── config/
│   ├── email/
│   ├── id/
│   ├── mailer/
│   ├── migrations/
│   ├── rabbitmq/
│   ├── realtime/
│   ├── seeder/
│   └── worker/
└── bootstrap/        # Application wiring & startup
```

The frontend mirrors this with a structured layout:

```
admin/src/
├── components/
│   ├── system/       # Reusable system components (AppForm, DataTable, FormInput…)
│   └── ui/           # shadcn-vue primitives (Button, Card, Dialog…)
├── composables/      # Vue composables
├── config/           # API & realtime config
├── lib/              # i18n setup, utilities
├── services/
│   ├── api/          # Typed API clients (auth, users, files)
│   └── http/         # HTTP client, error handling, session storage
├── stores/           # Pinia stores (session, preferences, realtime)
├── types/            # TypeScript type definitions
└── views/            # Page-level components
```

**Verdict: Very well structured.** Clear separation of concerns on both sides.

---

## Backend Review (Go)

### Security

#### What's Good

| Area                       | Detail                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **OTP hashing**            | OTP codes are SHA-256 hashed with a secret before storage — DB leaks don't expose codes |
| **Refresh token rotation** | Old tokens are revoked on use, preventing replay attacks                                |
| **Password hashing**       | bcrypt with `DefaultCost`                                                               |
| **Rate limiting**          | Per-IP token bucket with automatic cleanup of stale visitors                            |
| **Security headers**       | CSP, HSTS (conditional), X-Frame-Options DENY, Permissions-Policy, Referrer-Policy      |
| **CORS**                   | Explicit allowed origins, credentials enabled                                           |
| **Email validation**       | Disposable email blocklist + allowlist support                                          |

#### Issues

##### SEC-01 · `/auth/register` is publicly exposed 🔴

**File:** `api/internal/interfaces/http/router/router.go:41`

The `POST /auth/register` route is in the public group. For an admin panel, self-registration should either be removed, gated behind an invite system, or protected by an admin-only middleware.

**Recommendation:** Move to the authenticated admin group or remove entirely.

---

##### SEC-02 · JWT algorithm not pinned 🟡

**File:** `api/internal/application/auth/service.go:372`

```go
parsed, err := jwt.ParseWithClaims(token, &TokenClaims{}, func(_ *jwt.Token) (any, error) {
    return s.jwtSecret, nil
})
```

No `jwt.WithValidMethods([]string{"HS256"})` option is passed. An attacker could potentially exploit `alg` confusion.

**Recommendation:** Add `jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()})`.

---

##### SEC-03 · Tokens stored in `localStorage` 🟡

**File:** `admin/src/services/http/session.ts:10`

```ts
const storage = useStorage<StoredSessionState>('admin-session', { ... })
```

`localStorage` is accessible to any XSS payload. The refresh token especially should ideally be stored in an httpOnly cookie.

**Recommendation:** Consider migrating refresh tokens to httpOnly secure cookies. If not feasible, ensure robust CSP + XSS protection.

---

##### SEC-04 · No password max-length validation 🟡

**File:** `api/internal/application/auth/service.go` (multiple locations)

bcrypt silently truncates input at 72 bytes. Users with passwords longer than 72 characters would have effectively weaker passwords than expected.

**Recommendation:** Add server-side validation: `if len(password) > 72 { return ErrValidation }`.

---

##### SEC-05 · Auth endpoints share global rate limit 🟡

**File:** `api/internal/interfaces/http/router/router.go:30`

All endpoints share one rate limiter (default 120 RPM). Sensitive endpoints like `/auth/login`, `/auth/verify-otp`, and `/auth/reset-password` should have stricter per-endpoint limits (e.g. 5–10 attempts/min).

**Recommendation:** Add a secondary tighter `RateLimiter` applied only to auth routes.

---

### Code Quality

##### CQ-01 · `NewService` constructor has 11 parameters 🟡

**File:** `api/internal/application/auth/service.go:110`

```go
func NewService(users userdomain.Repository, refreshTokens authdomain.RefreshTokenRepository,
    otps authdomain.EmailOTPRepository, emailDispatcher EmailDispatcher,
    emailValidator platformemail.Validator, jwtSecret string,
    accessTokenTTL, refreshTokenTTL, loginOTPTTL, passwordResetOTPTTL time.Duration,
    defaultLocale userdomain.Locale) Service {
```

**Recommendation:** Group into a `ServiceConfig` struct.

---

##### CQ-02 · Duplicated `handleError` in handlers 🟡

**Files:** `api/internal/interfaces/http/handlers/auth_handler.go`, `user_handler.go`

Both handlers implement identical `handleError(c *gin.Context, err error)` methods with the same error-to-HTTP-status mapping logic.

**Recommendation:** Extract into a shared `handlers.HandleError(c, err)` function.

---

##### CQ-03 · Duplicated `toUserResponse` logic 🟡

**Files:** `api/internal/interfaces/http/handlers/auth_handler.go`, `user_handler.go`

Both have identical user-to-response mapping code.

**Recommendation:** Extract into a `presenters.UserResponse(user)` function.

---

##### CQ-04 · GORM dependency leak into application layer 🟡

**File:** `api/internal/application/auth/service.go:188` (and others)

```go
if errors.Is(err, gorm.ErrRecordNotFound) {
    return nil, appcommon.ErrNotFound
}
```

The application service directly checks for `gorm.ErrRecordNotFound`. This breaks hexagonal architecture — the repository should translate storage errors to domain errors.

**Recommendation:** Repositories should return `appcommon.ErrNotFound` directly. Remove `gorm` import from application layer.

---

### Missing Pieces

| ID    | Severity | Description                                                                                                                        |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| MP-01 | 🔴       | **No tests** — Zero Go test files in `api/`. Only one test exists in `realtime-gateway/`.                                          |
| MP-02 | 🟡       | **No structured logging** — Uses `log.Printf` everywhere. Migrate to `slog` or `zerolog` with structured fields for observability. |
| MP-03 | 🟡       | **No graceful shutdown for API** — The `realtime-gateway` handles `SIGINT/SIGTERM` properly, but the API server does not.          |
| MP-04 | 🟡       | **No request ID middleware** — No correlation ID propagated through requests for tracing/debugging.                                |
| MP-05 | 🟡       | **`EnsureDatabaseExists` auto-creates DB** — Risky in production. Should be a separate provisioning step.                          |
| MP-06 | 🟢       | **No Dockerfile** — Neither service has a Dockerfile for containerized deployment.                                                 |

---

## Frontend Review (Vue 3)

### Frontend Architecture

**Verdict: Well structured.**

- Clean `services/api` + `services/http` separation
- Typed API clients with proper error handling and token refresh
- Pinia stores with clear responsibilities
- vee-validate + Zod for form validation
- shadcn-vue component library well integrated
- System component abstractions (`AppForm`, `DataTable`, `FormInput`, etc.)
- i18n configured from the start

### Frontend Issues

##### FE-01 · Hardcoded 2000ms artificial delay in login 🔴

**File:** `admin/src/views/LoginView.vue:29-31`

```ts
const wait = () => new Promise((resolve) => setTimeout(resolve, 2000));
await wait();
```

This is debug/demo code left in production. Removes 2 seconds from every login attempt.

**Fix:** Delete these two lines.

---

##### FE-02 · `console.log` debug statements left in code 🔴

**File:** `admin/src/stores/realtime.ts:68`

```ts
console.log("connextion"); // typo: "connextion" → "connection"
```

**File:** `admin/src/stores/realtime.ts:172`

```ts
console.log({ message });
```

**Fix:** Remove both `console.log` calls.

---

##### FE-03 · `setupStatus` called on every navigation 🔴

**File:** `admin/src/router/index.ts:120`

```ts
const setupStatus = await authApi.setupStatus();
```

This unauthenticated API call fires in `beforeEach` on **every route change**.

**Fix:** Cache the result after the first successful call, or check only once during app bootstrap.

---

##### FE-04 · Incomplete i18n coverage 🟡

Despite having `vue-i18n` configured with `fr` and `en` locales, many strings are hardcoded in English:

- **`App.vue`** — Sidebar navigation labels (`"Users"`, `"Profile"`, `"Home"`, etc.)
- **`UsersView.vue`** — All labels, buttons, toast messages, column headers
- **`ProfileView.vue`** — All section titles, descriptions, button labels
- **`LoginView.vue`** — Toast messages (`"Welcome back."`, `"OTP sent to your email address."`)

**Fix:** Extract all user-facing strings to i18n locale files.

---

##### FE-05 · Table state reset after CRUD operations 🟡

**File:** `admin/src/views/UsersView.vue:171, 182, 197`

```ts
await loadUsers({
	filters: {},
	page: 1,
	pageSize: 10,
	search: "",
	sorting: [],
});
```

After creating/updating/toggling a user, the table reloads with hardcoded default params, losing the user's current pagination, search, and sorting state.

**Fix:** Store current `DataTable` params in a ref and use those when reloading.

---

##### FE-06 · Hardcoded mock notifications 🟡

**File:** `admin/src/App.vue:76-98`

A static array of 3 mock notifications is hardcoded. This data is displayed in the UI footer and notification panel.

**Fix:** Either connect to a real notifications API or remove the mock data.

---

##### FE-07 · Page title is `"Vite App"` 🟡

**File:** `admin/index.html`

The default Vite title was never updated.

**Fix:** Set to a proper app name, and consider using `useTitle()` composable for per-route titles.

---

##### FE-08 · `vite: "^6.2.0-beta.1"` in dependencies 🟡

**File:** `admin/package.json`

Using a beta version of the build tool in a production boilerplate is risky.

**Fix:** Pin to the latest stable Vite 6.x release.

---

##### FE-09 · `readStoredSession()` called redundantly 🟢

**File:** `admin/src/stores/session.ts:20-22`

Session fields are destructured from separate `readStoredSession()` calls during store init.

**Fix:** Call once, destructure from the result.

---

## UI/UX Review (Playwright)

UI was tested using Playwright MCP at desktop (1280×800) and mobile (375×812) viewports.

### Login Page

| Aspect                      | Status  | Notes                                                                                        |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| Layout                      | ✅ Good | Clean centered card, good spacing                                                            |
| Mobile responsive           | ✅ Good | Adapts well at 375px width                                                                   |
| Form validation             | ✅ Good | Zod schema validates email format + required password                                        |
| Password visibility toggle  | ✅ Good | Eye icon to show/hide                                                                        |
| Error handling              | ✅ Good | Toast notification on login failure                                                          |
| Missing: "Forgot password?" | ❌      | Backend supports it (`/auth/forgot-password` + `/auth/reset-password`) but no UI link exists |
| Missing: Branding           | ❌      | No logo or app name on the login page                                                        |
| Missing: Loading state      | ❌      | Blank white screen while `setupStatus` resolves                                              |

### Responsiveness

- **Login page:** Responsive, works well on mobile
- **Dashboard (sidebar layout):** Uses `SidebarProvider` with collapsible behavior — good foundation
- **Cards and grids:** Tailwind responsive classes applied consistently

### Recommendations for a Modern & Fluid UI

##### UX-01 · Add page transitions 🟡

No route transition animations exist. Add a `<Transition>` wrapper on the `<RouterView>` for smooth page changes:

```vue
<RouterView v-slot="{ Component }">
  <Transition name="fade" mode="out-in">
    <component :is="Component" />
  </Transition>
</RouterView>
```

---

##### UX-02 · Add a global loading state / skeleton 🟡

The `beforeEach` guard calls `setupStatus()` and `bootstrapSession()` before rendering anything. Users see a blank white page during this time.

**Recommendation:** Show a full-page spinner or skeleton screen while the app initializes.

---

##### UX-03 · Add a "Forgot password?" link on the login page 🟡

The backend fully supports password reset via OTP, but there's no UI entry point for it.

**Recommendation:** Add a link below the password field that navigates to a new `ForgotPasswordView`.

---

##### UX-04 · Add `autocomplete` attributes to form inputs 🟡

The browser console warns about missing `autocomplete` hints. Login form should have:

- Email: `autocomplete="email"`
- Password: `autocomplete="current-password"`

---

##### UX-05 · Improve sidebar header branding 🟡

Currently just a `<p>` tag with the app name. Should include a logo/icon and handle the collapsed sidebar state gracefully.

---

##### UX-06 · Add empty states for data views 🟡

The `UsersView` data table has no empty state illustration or message when no users match a search.

---

##### UX-07 · Add breadcrumbs for nested routes 🟡

Playground routes (`/playground/form`, `/playground/table`, etc.) are nested but only show a flat header title. Proper breadcrumbs would improve navigation context.

---

## Priority Matrix

### 🔴 Critical (fix before shipping)

| ID     | Area     | Description                                          |
| ------ | -------- | ---------------------------------------------------- |
| FE-01  | Frontend | Remove 2s artificial login delay                     |
| FE-02  | Frontend | Remove `console.log` debug statements + typo         |
| FE-03  | Frontend | Cache `setupStatus` — don't call on every navigation |
| SEC-01 | Backend  | Protect or remove `/auth/register` endpoint          |
| MP-01  | Backend  | Add unit and integration tests                       |

### 🟡 Important (should fix)

| ID     | Area     | Description                                        |
| ------ | -------- | -------------------------------------------------- |
| SEC-02 | Backend  | Pin JWT algorithm to HS256                         |
| SEC-03 | Backend  | Consider httpOnly cookies for refresh tokens       |
| SEC-04 | Backend  | Add password max-length validation (72 bytes)      |
| SEC-05 | Backend  | Stricter rate limits on auth endpoints             |
| CQ-01  | Backend  | Refactor 11-param constructor to config struct     |
| CQ-02  | Backend  | Extract shared `handleError` utility               |
| CQ-03  | Backend  | Extract shared `toUserResponse` presenter          |
| CQ-04  | Backend  | Remove GORM dependency from application layer      |
| MP-02  | Backend  | Add structured logging (`slog` / `zerolog`)        |
| MP-03  | Backend  | Add graceful shutdown to API server                |
| MP-04  | Backend  | Add request ID middleware                          |
| FE-04  | Frontend | Complete i18n coverage for all user-facing strings |
| FE-05  | Frontend | Preserve table state after CRUD operations         |
| FE-06  | Frontend | Remove or connect mock notifications               |
| FE-07  | Frontend | Fix page title                                     |
| FE-08  | Frontend | Pin Vite to stable release                         |
| UX-01  | UI/UX    | Add page transitions                               |
| UX-02  | UI/UX    | Add global loading state / skeleton                |
| UX-03  | UI/UX    | Add "Forgot password?" UI flow                     |
| UX-04  | UI/UX    | Add `autocomplete` attributes to forms             |

### 🟢 Nice to Have

| ID    | Area     | Description                           |
| ----- | -------- | ------------------------------------- |
| MP-05 | Backend  | Remove auto DB creation in production |
| MP-06 | Backend  | Add Dockerfiles                       |
| FE-09 | Frontend | Optimize `readStoredSession` calls    |
| UX-05 | UI/UX    | Improve sidebar branding              |
| UX-06 | UI/UX    | Add empty states for data views       |
| UX-07 | UI/UX    | Add breadcrumbs for nested routes     |

---

## Conclusion

This is a **very solid boilerplate** with clean hexagonal architecture on the backend, a well-organized Vue 3 frontend, and thoughtful security foundations (OTP hashing, token rotation, RBAC, security headers, rate limiting).

**Main strengths:**

- Clear separation of concerns across all 3 services
- Complete auth flow (login, 2FA, password reset, token refresh)
- Real-time infrastructure (SSE + WebSocket) wired end-to-end
- Reusable system components and form abstractions on the frontend
- i18n and dark mode support built in from day one

**Main gaps:**

- Leftover debug code (artificial delay, console.log)
- No backend tests
- Some security hardening needed (JWT algorithm pinning, rate limit granularity)
- Incomplete i18n coverage despite having the infrastructure
- UI needs transitions, loading states, and a forgot-password flow to feel polished

Overall: **ready for development use after addressing the 🔴 critical items above.**
