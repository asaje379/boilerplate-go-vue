import { apiRequest } from "@/services/http/client";
import type { ListQueryParams } from "@/types/api";
import type {
  ChangePasswordPayload,
  CreateUserPayload,
  UpdateProfilePayload,
  UpdateProfilePhotoPayload,
  UpdateSecurityPayload,
  UpdateUserPayload,
  User,
  UsersListResponse,
} from "@/types/user";

function buildListQuery(params: ListQueryParams = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `/users?${query}` : "/users";
}

export const usersApi = {
  changePassword(payload: ChangePasswordPayload) {
    return apiRequest<null>("/users/me/change-password", {
      body: payload,
      method: "POST",
    });
  },

  create(payload: CreateUserPayload) {
    return apiRequest<User>("/users", {
      body: payload,
      method: "POST",
    });
  },

  deactivate(userId: string) {
    return apiRequest<User>(`/users/${userId}/deactivate`, {
      method: "PATCH",
    });
  },

  getById(userId: string) {
    return apiRequest<User>(`/users/${userId}`);
  },

  getCurrent() {
    return apiRequest<User>("/users/me");
  },

  list(params?: ListQueryParams) {
    return apiRequest<UsersListResponse>(buildListQuery(params));
  },

  reactivate(userId: string) {
    return apiRequest<User>(`/users/${userId}/reactivate`, {
      method: "PATCH",
    });
  },

  update(userId: string, payload: UpdateUserPayload) {
    return apiRequest<User>(`/users/${userId}`, {
      body: payload,
      method: "PATCH",
    });
  },

  updateCurrent(payload: UpdateProfilePayload) {
    return apiRequest<User>("/users/me", {
      body: payload,
      method: "PATCH",
    });
  },

  updateSecurity(payload: UpdateSecurityPayload) {
    return apiRequest<User>("/users/me/security", {
      body: payload,
      method: "PATCH",
    });
  },

  updateProfilePhoto(payload: UpdateProfilePhotoPayload) {
    return apiRequest<User>("/users/me/profile-photo", {
      body: payload,
      method: "PATCH",
    });
  },
};
