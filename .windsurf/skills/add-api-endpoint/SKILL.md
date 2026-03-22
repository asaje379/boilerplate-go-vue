---
name: add-api-endpoint
description: Add or modify a Go API endpoint while preserving the clean architecture, request-response contracts, Swagger alignment, and any downstream frontend or realtime integration.
---

## When to use

Invoke this skill when adding a new REST endpoint or modifying an existing one in `api/`.

## Architecture checklist

1. **Domain layer** (`internal/domain/`)
   - Define or update entity structs
   - Define or update repository interface

2. **Application layer** (`internal/application/`)
   - Add/update service method with business logic
   - Return domain errors (`appcommon.ErrNotFound`, `appcommon.ErrConflict`, etc.)
   - Define request/response DTOs if needed

3. **HTTP layer** (`internal/interfaces/http/`)
   - Create handler function (thin: parse → call service → respond)
   - Use `common.HandleError()` for error mapping
   - Add Swagger annotations matching actual response shape
   - Wire route in router with correct middleware (auth, roles)

4. **Validation**
   - Use Gin's `ShouldBindJSON` for request binding
   - Add field-level validation tags on DTOs
   - Ensure validation errors return `{ error, code: "BAD_REQUEST", details: { field: message } }`

## Response envelope

See [response-envelope.md](./response-envelope.md) for the standard format.

## Post-implementation

- Verify Swagger annotations match actual response
- Check that frontend TypeScript types in `admin/src/services/api/` are updated if applicable
- Run `go test ./...` from `api/` directory
