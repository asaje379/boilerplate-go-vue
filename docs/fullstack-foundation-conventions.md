# Fullstack Foundation Conventions

This document defines the architectural patterns, cross-stack contracts, and implementation guidelines for the Boilerplate Go Vue stack.

---

## 1. System Architecture

### 1.1 Services Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Admin       │     │      PWA        │     │     Landing     │
│   (Vue 3 SPA)   │     │  (Vue 3 PWA)    │     │  (Static HTML)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      API (Go/Gin)       │
                    │   /api/v1/* endpoints   │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
    ┌──────▼──────┐    ┌─────────▼──────────┐   ┌──────▼──────┐
    │  PostgreSQL │    │ Realtime Gateway   │   │   MinIO   │
    │   (Data)    │    │  (SSE/WebSocket)   │   │   (Files)   │
    └─────────────┘    └─────────┬──────────┘   └─────────────┘
                                 │
                        ┌────────▼────────┐
                        │    RabbitMQ     │
                        │ (Events/Tasks)  │
                        └─────────────────┘
```

### 1.2 Communication Patterns

- **API** : Request/response HTTP REST JSON
- **Realtime** : Server-Sent Events (preferred) or WebSocket for live updates
- **Async Tasks** : RabbitMQ topic exchanges (emails, notifications)
- **Events** : RabbitMQ fanout for realtime broadcast

---

## 2. Backend Architecture (Go)

### 2.1 Clean Architecture Layers

```
api/internal/
├── domain/           # Entities, value objects, repository interfaces
│   ├── user/
│   ├── auth/
│   ├── file/
│   └── notification/
├── application/        # Use cases, services, DTOs, domain errors
│   ├── user/
│   ├── auth/
│   ├── file/
│   └── notification/
├── interfaces/http/  # HTTP handlers, middleware, presenters
│   ├── handlers/
│   ├── middleware/
│   └── router/
├── infrastructure/   # Repository implementations (GORM)
├── platform/         # Config, migrations, email, shared utils
└── bootstrap/        # Dependency injection, app initialization
```

### 2.2 Dependency Rule

Dependencies point inward:
- `interfaces` → `application` → `domain`
- `infrastructure` implements `domain` interfaces

### 2.3 Handler Pattern

```go
// Thin handler: validate, call service, respond
func (h *UserHandler) GetMe(c *gin.Context) {
    userID := c.GetString("userID")
    user, err := h.userService.GetByID(c.Request.Context(), userID)
    if err != nil {
        HandleError(c, err)
        return
    }
    c.JSON(http.StatusOK, presenter.UserFromDomain(user))
}
```

### 2.4 Domain Errors

All services return domain errors, mapped to HTTP in handlers:

| Domain Error | HTTP Status |
|--------------|-------------|
| `ErrNotFound` | 404 |
| `ErrConflict` | 409 |
| `ErrUnauthorized` | 401 |
| `ErrForbidden` | 403 |
| `ErrValidation` | 422 |
| `ErrInternal` | 500 |

---

## 3. Frontend Architecture (Vue)

### 3.1 Directory Structure

```
admin/src/
├── services/
│   ├── http/         # HTTP client, interceptors, errors
│   └── api/          # Domain API modules (auth, users, files)
├── stores/           # Pinia stores (session, preferences, realtime)
├── views/            # Page-level components
├── components/
│   ├── ui/           # shadcn-vue primitives
│   └── system/       # App-shell components
├── composables/      # Shared composition functions
├── locales/          # i18n files (en/, fr/)
└── lib/              # Utilities, i18n setup
```

### 3.2 API Service Pattern

Views/stores call domain API modules, never raw HTTP:

```typescript
// services/api/users.api.ts
export async function getCurrentUser(): Promise<User> {
  const response = await client.get<{ data: User }>('/api/v1/users/me');
  return response.data.data;
}

// stores/session.ts
const user = await usersApi.getCurrentUser();
```

### 3.3 Store Pattern

- `session` : Auth state, current user
- `preferences` : Theme, locale
- `realtime` : SSE connection, event handlers
- `notifications` : In-app notification list

---

## 4. Cross-Stack Contracts

### 4.1 API Response Envelope

**Success:**
```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

**Error:**
```json
{
  "error": "User not found",
  "code": "NOT_FOUND",
  "details": { "field": "user_id" }
}
```

### 4.2 Pagination & Search

Query parameters for list endpoints:
- `page` : Page number (1-based)
- `limit` : Items per page (max 100)
- `search` : Text search
- `sortBy` : Field name
- `sortOrder` : `asc` or `desc`

### 4.3 Realtime Events

Events flow: API → RabbitMQ → Realtime Gateway → Client

Event structure:
```json
{
  "type": "notification.created",
  "payload": { ... },
  "timestamp": "2026-01-01T00:00:00Z",
  "userID": "user-cuid"
}
```

Client subscribes with channels filter:
```
GET /rt/sse?access_token=...&channels=notifications,users
```

---

## 5. Database Conventions

### 5.1 Primary Keys

- Application IDs: CUID strings (e.g., `usr_cjld2cjxh0000qzrmn831i7rn`)
- Database internal: Auto-increment integers for foreign keys

### 5.2 Soft Deletes

Use `gorm.DeletedAt` for entities that require audit trail:
```go
type User struct {
    DeletedAt gorm.DeletedAt `gorm:"index"`
}
```

### 5.3 Migrations

- Development: GORM AutoMigrate
- Production: SQL migrations in `platform/migrations/sql/`
- State tracked in `schema_migrations` table

---

## 6. Authentication & Security

### 6.1 JWT

- Algorithm: HS256 only (pinned via `jwt.WithValidMethods`)
- Access token TTL: Configurable (default 15 min)
- Refresh token TTL: Configurable (default 7 days)
- Tokens stored in memory (Pinia), never localStorage

### 6.2 Login Flow (2FA)

```
POST /auth/login → OTP email sent → POST /auth/verify-otp → Tokens issued
```

### 6.3 Password Requirements

- Minimum 8 characters
- Maximum 72 bytes (bcrypt limit)
- bcrypt cost: 10

---

## 7. File Storage

### 7.1 Architecture

- Metadata: PostgreSQL (`files` table)
- Binary: S3-compatible (AWS or MinIO)

### 7.2 Upload Flow

1. Client → API: Upload request
2. API validates size (`FILE_MAX_SIZE_MB`)
3. Stream to S3/MinIO
4. Store metadata in DB
5. Return file ID

### 7.3 Download Options

- `GET /files/:id/download` : Direct download (authenticated)
- `GET /files/:id/download-signed` : Time-limited signed URL
- `GET /media/:id` : Public media proxy (for PWAs)

---

## 8. Notification System

### 8.1 Configuration

Notifications defined in `notifications.yaml`:
```yaml
notifications:
  - id: user.welcome
    channels: [in_app, email]
    template: welcome_email
```

### 8.2 Delivery

- `in_app` : Persist to DB + realtime event
- `email` : Async via RabbitMQ worker
- `whatsapp` : Optional via WASender

### 8.3 Realtime Flow

```
API publishes → RabbitMQ (boilerplate.realtime) → Gateway → SSE clients
```

---

## 9. Testing Conventions

### 9.1 Backend (Go)

- Unit tests: `*_test.go` alongside source
- Use interfaces for mocking repositories
- Table-driven tests for service logic
- `go test ./...` from `api/` directory

### 9.2 Frontend (Vue)

- Unit: Vitest + `@vue/test-utils`
- Component: Test behavior, not implementation
- E2E: Playwright, user flows only

### 9.3 Test Coverage Priority

1. Critical paths: Auth, file upload, payments (if any)
2. Complex business logic
3. Edge cases in validation

---

## 10. Environment & Deployment

### 10.1 Required Services

- PostgreSQL 16+
- RabbitMQ 4.1+
- MinIO or AWS S3

### 10.2 API Commands

```bash
go run . serve      # HTTP server + migrations
go run . worker     # Background task consumer
go run . migrate    # Migrations only
go run . seed       # Seed data
go run . swagger    # Regenerate docs
```

### 10.3 Docker Compose

Local development stack:
```bash
docker-compose up postgres rabbitmq minio
```

---

## 11. Code Style

### 11.1 Go

- `gofmt` / `goimports`
- Explicit error handling
- No global state
- Interface names: `-er` suffix (e.g., `UserRepository`)

### 11.2 TypeScript/Vue

- Strict mode enabled
- Composition API with `<script setup>`
- Props: TypeScript interfaces with `defineProps<T>()`
- No `any` types in production code

---

## 12. Adding New Features

### 12.1 Checklist

- [ ] Domain entity defined
- [ ] Repository interface + implementation
- [ ] Application service with tests
- [ ] HTTP handler with Swagger docs
- [ ] Route registered
- [ ] Frontend API module created
- [ ] Store updated (if needed)
- [ ] View component created
- [ ] i18n strings added (fr + en)
- [ ] E2E test for critical path

### 12.2 File Templates

See workflow `/add-feature` for scaffolding commands.

---

## References

- `/api/README.md` - API setup and endpoints
- `/admin/README.md` - Frontend development
- `/realtime-gateway/README.md` - Realtime service
