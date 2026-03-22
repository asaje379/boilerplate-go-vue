---
trigger: glob
globs: realtime-gateway/internal/**/*
---

# Realtime Gateway Contracts

- Preserve compatibility with API-issued JWTs and RabbitMQ realtime events
- Keep broker consumption, auth, and client broadcast responsibilities separated
- Reuse the registry and consumer patterns already present in the service
- Maintain consistent behavior between SSE and WebSocket unless a difference is explicit and documented

## Coordination

- Validate event-shape changes against the API publisher side
- Keep auth expectations aligned with the main API
- Reflect config or endpoint behavior changes in the service README when needed

## Validation

- Run targeted Go tests for realtime packages
- Verify startup still succeeds when config, bootstrapping, or transport wiring changes
