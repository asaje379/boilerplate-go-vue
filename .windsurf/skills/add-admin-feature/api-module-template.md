# API Module Template

```typescript
import { apiRequest } from "@/services/http/client";
import type { ApiListResponse } from "@/services/http/types";

// --- Types ---

export interface Thing {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThingPayload {
  name: string;
}

export interface UpdateThingPayload {
  name?: string;
}

// --- API functions ---

export function listThings(params?: { page?: number; perPage?: number }) {
  return apiRequest<ApiListResponse<Thing>>("/api/v1/things", { params });
}

export function getThing(id: string) {
  return apiRequest<Thing>(`/api/v1/things/${id}`);
}

export function createThing(payload: CreateThingPayload) {
  return apiRequest<Thing>("/api/v1/things", {
    method: "POST",
    body: payload,
  });
}

export function updateThing(id: string, payload: UpdateThingPayload) {
  return apiRequest<Thing>(`/api/v1/things/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteThing(id: string) {
  return apiRequest<void>(`/api/v1/things/${id}`, {
    method: "DELETE",
  });
}
```
