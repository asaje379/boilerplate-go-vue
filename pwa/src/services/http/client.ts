const ACCESS_TOKEN_KEY = "asaje.pwa.accessToken";

export function readAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function writeAccessToken(token: string | null) {
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function apiRequest<TResponse>(path: string, options: RequestInit = {}) {
  const token = readAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || "Request failed");
  }

  return payload as TResponse;
}
