package presenter

import (
	appcommon "api/internal/application/common"
	userdomain "api/internal/domain/user"
)

type UserResponse struct {
	ID                 string            `json:"id"`
	Name               string            `json:"name"`
	Email              string            `json:"email"`
	PreferredLocale    userdomain.Locale `json:"preferredLocale" example:"fr" enums:"fr,en"`
	MustChangePassword bool              `json:"mustChangePassword"`
	ProfilePhotoFileID *string           `json:"profilePhotoFileId,omitempty"`
	ProfilePhotoURL    string            `json:"profilePhotoUrl,omitempty"`
	TwoFactorEnabled   bool              `json:"twoFactorEnabled"`
	IsActive           bool              `json:"isActive"`
	Role               userdomain.Role   `json:"role" example:"user" enums:"admin,user"`
	CreatedAt          string            `json:"createdAt"`
	UpdatedAt          string            `json:"updatedAt"`
}

type PaginatedUsersResponse struct {
	Items []UserResponse         `json:"items"`
	Meta  PaginationMetaResponse `json:"meta"`
}

type PaginationMetaResponse struct {
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
	Total      int64  `json:"total"`
	TotalPages int    `json:"totalPages"`
	Search     string `json:"search,omitempty"`
	SortBy     string `json:"sortBy,omitempty"`
	SortOrder  string `json:"sortOrder,omitempty"`
}

func ToUserResponse(user *userdomain.User, profilePhotoURL string) UserResponse {
	return UserResponse{
		ID:                 user.ID,
		Name:               user.Name,
		Email:              user.Email,
		PreferredLocale:    user.PreferredLocale.Normalize(),
		MustChangePassword: user.MustChangePassword,
		ProfilePhotoFileID: user.ProfilePhotoFileID,
		ProfilePhotoURL:    profilePhotoURL,
		TwoFactorEnabled:   user.TwoFactorEnabled,
		IsActive:           user.IsActive,
		Role:               user.Role,
		CreatedAt:          user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:          user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func ToUsersResponse(users []userdomain.User, profilePhotoURLs map[string]string) []UserResponse {
	responses := make([]UserResponse, 0, len(users))
	for i := range users {
		responses = append(responses, ToUserResponse(&users[i], profilePhotoURLs[users[i].ID]))
	}

	return responses
}

func ToPaginatedUsersResponse(result *appcommon.PageResult[userdomain.User]) PaginatedUsersResponse {
	return ToPaginatedUsersResponseWithPhotos(result, nil)
}

func ToPaginatedUsersResponseWithPhotos(result *appcommon.PageResult[userdomain.User], profilePhotoURLs map[string]string) PaginatedUsersResponse {
	return PaginatedUsersResponse{
		Items: ToUsersResponse(result.Items, profilePhotoURLs),
		Meta: PaginationMetaResponse{
			Page:       result.Meta.Page,
			Limit:      result.Meta.Limit,
			Total:      result.Meta.Total,
			TotalPages: result.Meta.TotalPages,
			Search:     result.Meta.Search,
			SortBy:     result.Meta.SortBy,
			SortOrder:  result.Meta.SortOrder,
		},
	}
}
