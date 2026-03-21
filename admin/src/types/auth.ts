import type { User } from "@/types/user";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface BootstrapFirstAdminPayload {
  email: string;
  name: string;
  password: string;
  preferredLocale: "fr" | "en";
}

export interface LoginChallenge {
  accessToken?: string;
  email: string;
  expiresAt?: string;
  message: string;
  otpExpiresAt: string;
  refreshToken?: string;
  requiresOtp: boolean;
  requiresPasswordChange?: boolean;
  user?: User;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
}

export interface AuthSession extends AuthTokens {
  user: User;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  refreshToken: string;
}

export interface SetupStatus {
  hasAdminUsers: boolean;
  requiresSetup: boolean;
}
