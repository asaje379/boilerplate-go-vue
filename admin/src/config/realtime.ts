export const REALTIME_BASE_URL =
  (import.meta.env.VITE_REALTIME_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8090'

export const REALTIME_RECONNECT_DELAY_MS = Number(
  import.meta.env.VITE_REALTIME_RECONNECT_DELAY_MS || 3000,
)

export const REALTIME_DEFAULT_TRANSPORT =
  (import.meta.env.VITE_REALTIME_DEFAULT_TRANSPORT as 'sse' | 'ws' | undefined) || 'sse'
