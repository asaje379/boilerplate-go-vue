import type { AppLocale } from "@/lib/i18n";
import type { PaginatedResponse } from "@/types/api";

export type UserRole = "admin" | "user";

export interface User {
  createdAt: string;
  email: string;
  id: string;
  isActive: boolean;
  mustChangePassword: boolean;
  name: string;
  preferredLocale: AppLocale;
  profilePhotoFileId?: string | null;
  profilePhotoUrl?: string;
  role: UserRole;
  twoFactorEnabled: boolean;
  updatedAt: string;
  whatsAppPhone: string;
  notifyEmail: boolean;
  notifyInApp: boolean;
  notifyWhatsapp: boolean;
}

export type UsersListResponse = PaginatedResponse<User>;

export interface CreateUserPayload {
  email: string;
  mustChangePassword: boolean;
  name: string;
  password: string;
  preferredLocale?: AppLocale;
  role: UserRole;
  whatsAppPhone?: string;
}

export interface UpdateUserPayload {
  email: string;
  name: string;
  preferredLocale: AppLocale;
  role: UserRole;
  whatsAppPhone?: string;
}

export interface UpdateProfilePayload {
  email: string;
  name: string;
  preferredLocale: AppLocale;
  whatsAppPhone?: string;
}

export interface UpdateProfilePhotoPayload {
  fileId: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateSecurityPayload {
  twoFactorEnabled: boolean;
}

export interface UpdateNotificationPrefsPayload {
  notifyEmail: boolean;
  notifyInApp: boolean;
  notifyWhatsapp: boolean;
  whatsAppPhone?: string;
}
