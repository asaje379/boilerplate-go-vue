import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { authApi } from "@/services/api/auth.api";
import { usersApi } from "@/services/api/users.api";
import { clearStoredSession, readStoredSession, writeStoredSession } from "@/services/http/session";
import type {
  BootstrapFirstAdminPayload,
  LoginChallenge,
  LoginPayload,
  VerifyOtpPayload,
} from "@/types/auth";
import type {
  ChangePasswordPayload,
  UpdateProfilePayload,
  UpdateSecurityPayload,
  User,
} from "@/types/user";

export const useSessionStore = defineStore("session", () => {
  const accessToken = ref<string | null>(readStoredSession().accessToken);
  const refreshToken = ref<string | null>(readStoredSession().refreshToken);
  const expiresAt = ref<string | null>(readStoredSession().expiresAt);
  const currentUser = ref<User | null>(readStoredSession().currentUser);
  const isBootstrappingSession = ref(false);
  const otpChallenge = ref<LoginChallenge | null>(null);
  const requiresPasswordChange = computed(() => Boolean(currentUser.value?.mustChangePassword));

  const isAuthenticated = computed(() =>
    Boolean(accessToken.value && refreshToken.value && currentUser.value),
  );

  function persistSession() {
    writeStoredSession({
      accessToken: accessToken.value,
      currentUser: currentUser.value,
      expiresAt: expiresAt.value,
      refreshToken: refreshToken.value,
    });
  }

  function applySession(payload: {
    accessToken: string;
    expiresAt: string;
    refreshToken: string;
    user: User;
  }) {
    accessToken.value = payload.accessToken;
    expiresAt.value = payload.expiresAt;
    refreshToken.value = payload.refreshToken;
    currentUser.value = payload.user;
    otpChallenge.value = null;
    persistSession();
  }

  function clearSession() {
    accessToken.value = null;
    expiresAt.value = null;
    refreshToken.value = null;
    currentUser.value = null;
    otpChallenge.value = null;
    clearStoredSession();
  }

  async function login(payload: LoginPayload) {
    const result = await authApi.login(payload);

    if (
      !result.requiresOtp &&
      result.accessToken &&
      result.refreshToken &&
      result.expiresAt &&
      result.user
    ) {
      applySession({
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        refreshToken: result.refreshToken,
        user: result.user,
      });
      return result;
    }

    otpChallenge.value = result;
    return result;
  }

  async function bootstrapFirstAdmin(payload: BootstrapFirstAdminPayload) {
    const session = await authApi.bootstrapFirstAdmin(payload);
    applySession(session);
    return session;
  }

  async function verifyOtp(payload: VerifyOtpPayload) {
    const session = await authApi.verifyOtp(payload);
    applySession(session);
    return session;
  }

  async function fetchCurrentUser() {
    const user = await usersApi.getCurrent();
    currentUser.value = user;
    persistSession();
    return user;
  }

  async function updateCurrentProfile(payload: UpdateProfilePayload & { email: string }) {
    const user = await usersApi.updateCurrent(payload);
    currentUser.value = user;
    persistSession();
    return user;
  }

  async function updateCurrentProfilePhoto(fileId: string | null) {
    const user = await usersApi.updateProfilePhoto({ fileId });
    currentUser.value = user;
    persistSession();
    return user;
  }

  async function updateSecurity(payload: UpdateSecurityPayload) {
    const user = await usersApi.updateSecurity(payload);
    currentUser.value = user;
    persistSession();
    return user;
  }

  async function changePassword(payload: ChangePasswordPayload) {
    await usersApi.changePassword(payload);
    if (currentUser.value) {
      currentUser.value = {
        ...currentUser.value,
        mustChangePassword: false,
      };
      persistSession();
    }
  }

  async function refreshSession() {
    if (!refreshToken.value) {
      clearSession();
      return null;
    }

    const session = await authApi.refresh({ refreshToken: refreshToken.value });
    applySession(session);
    return session;
  }

  async function bootstrapSession() {
    if (isBootstrappingSession.value) {
      return;
    }

    isBootstrappingSession.value = true;

    try {
      if (!refreshToken.value) {
        clearSession();
        return;
      }

      const session = await refreshSession();
      currentUser.value = session?.user ?? null;
    } catch {
      clearSession();
    } finally {
      isBootstrappingSession.value = false;
    }
  }

  async function logout() {
    try {
      if (refreshToken.value) {
        await authApi.logout({ refreshToken: refreshToken.value });
      }
    } finally {
      clearSession();
    }
  }

  return {
    accessToken,
    bootstrapFirstAdmin,
    bootstrapSession,
    changePassword,
    clearSession,
    currentUser,
    expiresAt,
    fetchCurrentUser,
    isAuthenticated,
    isBootstrappingSession,
    login,
    logout,
    otpChallenge,
    requiresPasswordChange,
    refreshSession,
    refreshToken,
    updateCurrentProfile,
    updateCurrentProfilePhoto,
    updateSecurity,
    verifyOtp,
  };
});
