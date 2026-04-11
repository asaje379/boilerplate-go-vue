package user

import (
	"context"

	appcommon "api/internal/application/common"
)

type Repository interface {
	Create(ctx context.Context, user *User) error
	CountAdmins(ctx context.Context) (int64, error)
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	ListIDsByRole(ctx context.Context, role Role) ([]string, error)
	List(ctx context.Context, params appcommon.ListParams) ([]User, int64, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, user *User) error
	UpdatePassword(ctx context.Context, id string, passwordHash string) error
	UpdateProfilePhoto(ctx context.Context, id string, profilePhotoFileID *string) error
	UpdateIsActive(ctx context.Context, id string, isActive bool) error
	UpdateTwoFactorEnabled(ctx context.Context, id string, enabled bool) error
}
