import { useStorage } from '@vueuse/core'
import { computed } from 'vue'

export interface StoredSessionState {
  accessToken: string | null
  expiresAt: string | null
  refreshToken: string | null
}

const storage = useStorage<StoredSessionState>('admin-session', {
  accessToken: null,
  expiresAt: null,
  refreshToken: null,
})

export const sessionStorageState = computed(() => storage.value)

export function readStoredSession(): StoredSessionState {
  return storage.value
}

export function writeStoredSession(payload: StoredSessionState) {
  storage.value = payload
}

export function clearStoredSession() {
  storage.value = {
    accessToken: null,
    expiresAt: null,
    refreshToken: null,
  }
}
