# Project Conventions

This repository contains three main application surfaces:

- `admin/` — Vue 3 + Vite admin frontend
- `api/` — Go HTTP API with clean architecture (domain → application → interfaces)
- `realtime-gateway/` — Go realtime transport service (SSE + WebSocket via RabbitMQ)

## Cross-stack contracts

- Frontend views use domain API modules (`services/api/*.api.ts`), never raw `fetch`
- Backend handlers stay thin; business logic lives in application services
- Realtime changes must keep JWT auth and RabbitMQ event flow compatible
- API responses follow the envelope: `{ data, meta? }` for success, `{ error, code, details? }` for errors

## Change strategy

- Prefer small, targeted edits that extend existing patterns
- If a change affects both producer and consumer, verify both sides
- Run the smallest relevant validation for the area touched
- Use repository scripts and standard toolchain commands already present

## Documentation

- `docs/fullstack-foundation-conventions-steps-1-to-5.md` — architectural foundation patterns
- `docs/design-system-foundation-checklist.md` — UI/app-shell consistency reference
- Update nearby docs when a shared contract or pattern changes

## Security

- Never commit `.env` files, secrets, generated binaries, or local artifacts
- JWT uses HS256 with pinned algorithm; passwords hashed with bcrypt (max 72 bytes)
- All authenticated endpoints require valid access token; refresh flow handles expiry
