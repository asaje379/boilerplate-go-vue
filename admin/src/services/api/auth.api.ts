import { apiRequest } from "@/services/http/client";
import type {
  AuthSession,
  BootstrapFirstAdminPayload,
  LoginChallenge,
  LoginPayload,
  LogoutPayload,
  RefreshPayload,
  SetupStatus,
  VerifyOtpPayload,
} from "@/types/auth";

export const authApi = {
  bootstrapFirstAdmin(payload: BootstrapFirstAdminPayload) {
    return apiRequest<AuthSession>("/auth/bootstrap-first-admin", {
      body: payload,
      method: "POST",
      skipAuth: true,
      skipRefresh: true,
    });
  },

  login(payload: LoginPayload) {
    return apiRequest<LoginChallenge>("/auth/login", {
      body: payload,
      method: "POST",
      skipAuth: true,
      skipRefresh: true,
    });
  },

  logout(payload: LogoutPayload) {
    return apiRequest<null>("/auth/logout", {
      body: payload,
      method: "POST",
      skipRefresh: true,
    });
  },

  refresh(payload: RefreshPayload) {
    return apiRequest<AuthSession>("/auth/refresh", {
      body: payload,
      method: "POST",
      skipAuth: true,
      skipRefresh: true,
    });
  },

  setupStatus() {
    return apiRequest<SetupStatus>("/auth/setup-status", {
      skipAuth: true,
      skipRefresh: true,
    });
  },

  verifyOtp(payload: VerifyOtpPayload) {
    return apiRequest<AuthSession>("/auth/verify-otp", {
      body: payload,
      method: "POST",
      skipAuth: true,
      skipRefresh: true,
    });
  },
};
