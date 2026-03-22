import { API_BASE_URL, API_TIMEOUT_MS } from "@/config/api";
import { notifyApiError } from "@/services/http/error-notifier";
import { clearStoredSession, readStoredSession, writeStoredSession } from "@/services/http/session";
import { createApiError, createNetworkError, suppressApiErrorToast } from "@/services/http/errors";
import type { AuthSession } from "@/types/auth";

export interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: BodyInit | null | object;
  headers?: HeadersInit;
  skipAuth?: boolean;
  skipErrorToast?: boolean;
  skipRefresh?: boolean;
  timeoutMs?: number;
}

let refreshPromise: Promise<AuthSession> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHeaders(options?: HeadersInit, hasJsonBody?: boolean, includeAuth = true) {
  const headers = new Headers(options);
  headers.set("Accept", "application/json");

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const { accessToken } = readStoredSession();
  if (includeAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

function normalizeBody(body?: RequestOptions["body"]) {
  if (!body) {
    return { body: undefined, isJson: false };
  }

  if (body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) {
    return { body, isJson: false };
  }

  if (typeof body === "string") {
    return { body, isJson: false };
  }

  return { body: JSON.stringify(body), isJson: true };
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function refreshSession() {
  if (!refreshPromise) {
    const { refreshToken } = readStoredSession();

    if (!refreshToken) {
      throw createApiError(401, { error: "unauthorized" });
    }

    refreshPromise = fetch(buildUrl("/auth/refresh"), {
      body: JSON.stringify({ refreshToken }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    })
      .then(async (response) => {
        const payload = await parseResponse(response);

        if (!response.ok || !payload || typeof payload !== "object") {
          throw createApiError(response.status, payload);
        }

        const session = payload as AuthSession;
        writeStoredSession({
          accessToken: session.accessToken,
          expiresAt: session.expiresAt,
          refreshToken: session.refreshToken,
        });

        return session;
      })
      .catch((error: unknown) => {
        clearStoredSession();
        onSessionExpired?.();
        throw suppressApiErrorToast(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? API_TIMEOUT_MS);
  const { body, isJson } = normalizeBody(options.body);

  try {
    const response = await fetch(buildUrl(path), {
      ...options,
      body,
      headers: buildHeaders(options.headers, isJson, !options.skipAuth),
      signal: options.signal ?? controller.signal,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 401 && !options.skipRefresh && !options.skipAuth) {
        await refreshSession();
        return apiRequest<TResponse>(path, { ...options, skipRefresh: true });
      }

      throw createApiError(response.status, payload);
    }

    return payload as TResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const timeoutError = createNetworkError("Request timeout");
      notifyApiError(timeoutError, { skipErrorToast: options.skipErrorToast });
      throw timeoutError;
    }

    if (error instanceof Error) {
      notifyApiError(error, { skipErrorToast: options.skipErrorToast });
      throw error;
    }

    const networkError = createNetworkError();
    notifyApiError(networkError, { skipErrorToast: options.skipErrorToast });
    throw networkError;
  } finally {
    window.clearTimeout(timeout);
  }
}
