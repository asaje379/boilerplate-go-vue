---
trigger: glob
globs: api/**/*.go, realtime-gateway/**/*.go
---

# Go Conventions

- Handlers stay thin: parse input → call service → write response
- Use `common.HandleError()` for consistent error-to-HTTP mapping
- Services return domain errors (`appcommon.ErrNotFound`, `appcommon.ErrConflict`), not raw GORM errors
- Repositories wrap `gorm.ErrRecordNotFound` as `appcommon.ErrNotFound`
- JWT: pin algorithm to HS256 via `jwt.WithValidMethods([]string{"HS256"})`
- Passwords: bcrypt, min 8 chars, max 72 bytes enforced at service level
- All new endpoints must have Swagger annotations aligned with actual response shape
- Use `context.Context` propagation from Gin's `c.Request.Context()`
- Graceful shutdown: use `signal.NotifyContext` with `SIGINT`/`SIGTERM`
- Prefer table-driven tests; mock repositories via interfaces
