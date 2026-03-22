---
trigger: model_decision
description: Enforces frontend/backend/realtime contract alignment when changes span multiple services
---

# Cross-Stack Contract Rules

When a change touches both producer (API) and consumer (admin frontend or realtime-gateway), verify both sides:

## API Response Envelope
- Success: `{ "data": T, "meta"?: { page, perPage, total } }`
- Error: `{ "error": string, "code": string, "details"?: Record<string, string> }`
- Validation errors: `details` maps field names to error messages

## Frontend API Module Contract
- Each API module in `admin/src/services/api/` must match the backend route signature
- TypeScript types/interfaces must mirror the Go response DTOs
- Error handling: catch `ApiError` and map `code` to i18n keys

## Realtime Event Contract
- Events from RabbitMQ use the same JSON shape as API payloads
- JWT auth on WebSocket/SSE connections uses the same signing key and algorithm
- Channel names must match between publisher (API) and subscriber (realtime-gateway)

## Reference Documents
- `docs/fullstack-foundation-conventions-steps-1-to-5.md` — architectural patterns
- `docs/design-system-foundation-checklist.md` — UI/app-shell consistency
