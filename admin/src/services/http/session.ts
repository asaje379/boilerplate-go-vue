import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import type { User } from '@/types/user'

export interface StoredSessionState {
  accessToken: string | null
  currentUser: User | null
  expiresAt: string | null
  refreshToken: string | null
}

const storage = useStorage<StoredSessionState>('admin-session', {
  accessToken: null,
  currentUser: null,
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
    currentUser: null,
    expiresAt: null,
    refreshToken: null,
  }
}
