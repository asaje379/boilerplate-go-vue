---
description: End-to-end guide for adding a new feature spanning API and admin frontend
---

1. **Clarify scope**: Ask the user what the feature is. Determine which services are affected (`api`, `admin`, `realtime-gateway`).

2. **Backend first** (if API changes needed):
   a. Define or update the domain entity in `api/internal/domain/`
   b. Add/update the repository interface and GORM implementation
   c. Add/update the application service with business logic
   d. Create the HTTP handler in `api/internal/interfaces/http/`
   e. Wire the route in the router with appropriate middleware (auth, roles)
   f. Add Swagger annotations matching the actual response shape
   g. Verify both success and error paths return the correct envelope

3. **Frontend second** (if admin changes needed):
   a. Create/update the API module in `admin/src/services/api/`
   b. Add TypeScript types matching the API response DTOs
   c. Create/update the Pinia store if shared state is needed
   d. Create the view in `admin/src/views/` with i18n strings
   e. Add the route in `admin/src/router/index.ts` with `meta.title`
   f. Add locale keys in both `en/` and `fr/` locale files
   g. Add navigation entry in `App.vue` if it's a top-level page

4. **Realtime** (if events needed):
   a. Publish domain events from the API service via RabbitMQ
   b. Add event handler in `realtime-gateway` to relay to connected clients
   c. Subscribe to the event channel in the frontend store

5. **Verify cross-stack contract**: Ensure API response shape, TypeScript types, and frontend consumption are aligned.

6. Summarize all changes and list files modified.
