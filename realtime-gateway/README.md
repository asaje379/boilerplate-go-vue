# Realtime Gateway

Service Go dedie au transport temps reel du boilerplate.

## Responsabilites

- expose deux endpoints distincts : `GET /rt/sse` et `GET /rt/ws`
- authentifie le client avec le meme JWT que l'API
- consomme les evenements publies sur RabbitMQ
- diffuse les evenements autorises aux connexions SSE et WebSocket

## Variables d'environnement

- `PORT`
- `JWT_SECRET`
- `RABBITMQ_URL`
- `RABBITMQ_REALTIME_EXCHANGE`
- `CORS_ALLOWED_ORIGINS`
- `REALTIME_INSTANCE_ID`
- `REALTIME_QUEUE_PREFIX`
- `REALTIME_HEARTBEAT_SECONDS`
- `REALTIME_WRITE_TIMEOUT_SECONDS`

## Demarrage

```bash
cp .env.example .env
go mod tidy
go run .
```

## Endpoints

- `GET /health`
- `GET /rt/sse`
- `GET /rt/ws`

## Authentification

- header `Authorization: Bearer <token>` supporte
- query param `access_token=<token>` supporte aussi pour SSE/WebSocket navigateur
- query param `channels=users,files` pour limiter les canaux recues

## RabbitMQ

- le service suppose RabbitMQ `4.1+`
- chaque instance cree sa propre queue ephemere, bindee sur `#`, afin que toutes les instances recoivent une copie complete du flux realtime
