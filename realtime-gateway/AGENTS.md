# Realtime Gateway Conventions

Go service bridging domain events from RabbitMQ to frontend clients via SSE and WebSocket.

## Architecture

- Gin HTTP server with JWT auth middleware (shared signing key with API)
- RabbitMQ consumer listens for domain events
- Client connections managed per-user with channel subscriptions
- Presence tracking via heartbeats

## Rules

- Keep transport-agnostic: SSE and WebSocket share the same event dispatch logic
- JWT validation must use the same algorithm and secret as the API service
- Graceful shutdown: drain connections before stopping
- Event payloads follow the same JSON envelope as API responses
- No business logic here — this service is a pure event relay

## Configuration

- Environment variables for RabbitMQ URL, JWT secret, server port
- Shared `.env` pattern with the API service
