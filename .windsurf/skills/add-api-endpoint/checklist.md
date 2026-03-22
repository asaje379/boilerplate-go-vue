# API Endpoint Checklist

- Route and method defined clearly
- Handler stays thin
- Business logic lives in `internal/application`
- Repository or adapter changes stay in the right layer
- Error mapping stays predictable for frontend consumers
- Swagger updated when contract changes
- README updated when env vars or commands change
- Realtime implications checked if events are published
- Relevant Go validation commands selected
