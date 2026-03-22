# API Response Envelope

## Success response

```json
{
  "data": { ... }
}
```

With pagination:

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 142
  }
}
```

## Error response

```json
{
  "error": "Human-readable message",
  "code": "NOT_FOUND"
}
```

## Validation error response

```json
{
  "error": "Validation failed",
  "code": "BAD_REQUEST",
  "details": {
    "email": "Email is invalid",
    "password": "Minimum 8 characters"
  }
}
```

## Error codes

| Code | HTTP Status | When |
|------|-------------|------|
| `BAD_REQUEST` | 400 | Invalid input / validation failure |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Valid token but insufficient role |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate resource (e.g., email already taken) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
