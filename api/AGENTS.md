# API Conventions

Go HTTP API using Gin, GORM, PostgreSQL, JWT, RabbitMQ, S3/MinIO.

## Architecture

```
internal/
  domain/         → entities, value objects, repository interfaces
  application/    → services (business logic), DTOs, domain errors
  interfaces/http/→ handlers (thin), middleware, routes, swagger
  platform/       → infrastructure (email, mailer, id generation)
bootstrap/        → app wiring, config, database, migrations
```

## Rules

- Handlers are thin: validate input, call service, map response — no business logic
- Services return domain errors (`appcommon.ErrNotFound`, `appcommon.ErrConflict`, etc.)
- Repositories return `appcommon.ErrNotFound` instead of leaking `gorm.ErrRecordNotFound`
- Use `common.HandleError()` in handlers for consistent error→HTTP mapping
- All routes under `/api/v1`; Swagger annotations stay aligned with actual responses
- Request/response structs live next to their handler or in a shared `dto` package
- JWT: HS256 only, pinned via `jwt.WithValidMethods`
- Passwords: bcrypt hash, min 8 chars, max 72 bytes

## Database

- Migrations via GORM AutoMigrate for development; SQL migrations for production
- Use `uuid` primary keys
- Soft deletes where applicable (`gorm.DeletedAt`)

## Testing

- Unit tests alongside source files (`*_test.go`)
- Use interfaces for repository mocking
- `go test ./...` from `api/` directory
