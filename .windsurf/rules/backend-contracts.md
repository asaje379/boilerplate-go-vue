---
trigger: glob
globs: api/internal/**/*
---

# API Backend Contracts

- Keep handlers thin and push business logic into `internal/application`
- Reuse existing repositories and services before adding new wiring patterns
- Prefer shared response helpers and stable error mapping over repeated ad hoc `c.JSON(...)`
- Keep request and response contracts explicit enough for the frontend to consume predictably
- Avoid exposing infrastructure-specific error details to API clients

## Coordination

- If an endpoint contract changes, update Swagger and relevant documentation
- If an event published to RabbitMQ changes, verify the realtime consumer side too
- Keep environment variable changes reflected in `api/README.md` when relevant

## Validation

- Run targeted Go tests for touched packages
- Build or boot the service when changes affect routing, dependency wiring, config, or startup behavior
