package postgres

import (
	"context"
	"errors"

	appcommon "api/internal/application/common"
	userdomain "api/internal/domain/user"
	platformid "api/internal/platform/id"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return UserRepository{db: db}
}

func (r UserRepository) Create(ctx context.Context, user *userdomain.User) error {
	if user.ID == "" {
		user.ID = platformid.New()
	}
	user.IsActive = true
	user.TwoFactorEnabled = false
	user.NotifyEmail = true
	user.NotifyInApp = true

	model := fromDomainUser(user)
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}

	*user = *model.toDomain()
	return nil
}

func (r UserRepository) CountAdmins(ctx context.Context) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&UserModel{}).Where("role = ?", userdomain.RoleAdmin).Count(&count).Error; err != nil {
		return 0, err
	}

	return count, nil
}

func (r UserRepository) GetByID(ctx context.Context, id string) (*userdomain.User, error) {
	var model UserModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, appcommon.ErrNotFound
		}
		return nil, err
	}

	return model.toDomain(), nil
}

func (r UserRepository) GetByEmail(ctx context.Context, email string) (*userdomain.User, error) {
	var model UserModel
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, appcommon.ErrNotFound
		}
		return nil, err
	}

	return model.toDomain(), nil
}

func (r UserRepository) ListIDsByRole(ctx context.Context, role userdomain.Role) ([]string, error) {
	ids := make([]string, 0)
	if err := r.db.WithContext(ctx).Model(&UserModel{}).Where("role = ?", role).Pluck("id", &ids).Error; err != nil {
		return nil, err
	}

	return ids, nil
}

func (r UserRepository) List(ctx context.Context, params appcommon.ListParams) ([]userdomain.User, int64, error) {
	query, err := applyListQuery(
		r.db.WithContext(ctx).Model(&UserModel{}),
		params,
		[]string{"name", "email", "whats_app_phone", "role"},
		map[string]string{
			"createdAt":     "created_at",
			"updatedAt":     "updated_at",
			"name":          "name",
			"email":         "email",
			"whatsAppPhone": "whats_app_phone",
			"role":          "role",
		},
	)
	if err != nil {
		return nil, 0, err
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var models []UserModel
	if err := query.Limit(params.Limit).Offset(params.Offset()).Find(&models).Error; err != nil {
		return nil, 0, err
	}

	users := make([]userdomain.User, 0, len(models))
	for _, model := range models {
		users = append(users, *model.toDomain())
	}

	return users, total, nil
}

func (r UserRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&UserModel{}).Count(&count).Error; err != nil {
		return 0, err
	}

	return count, nil
}

func (r UserRepository) Update(ctx context.Context, user *userdomain.User) error {
	if err := r.db.WithContext(ctx).
		Model(&UserModel{}).
		Where("id = ?", user.ID).
		Updates(map[string]any{
			"name":                 user.Name,
			"email":                user.Email,
			"whats_app_phone":      user.WhatsAppPhone,
			"notify_email":         user.NotifyEmail,
			"notify_in_app":        user.NotifyInApp,
			"notify_whatsapp":      user.NotifyWhatsapp,
			"must_change_password": user.MustChangePassword,
			"preferred_locale":     user.PreferredLocale,
			"two_factor_enabled":   user.TwoFactorEnabled,
			"role":                 user.Role,
			"is_active":            user.IsActive,
		}).Error; err != nil {
		return err
	}

	updated, err := r.GetByID(ctx, user.ID)
	if err != nil {
		return err
	}

	*user = *updated
	return nil
}

func (r UserRepository) UpdatePassword(ctx context.Context, id string, passwordHash string) error {
	return r.db.WithContext(ctx).Model(&UserModel{}).Where("id = ?", id).Updates(map[string]any{
		"password_hash":        passwordHash,
		"must_change_password": false,
	}).Error
}

func (r UserRepository) UpdateProfilePhoto(ctx context.Context, id string, profilePhotoFileID *string) error {
	return r.db.WithContext(ctx).Model(&UserModel{}).Where("id = ?", id).Update("profile_photo_file_id", profilePhotoFileID).Error
}

func (r UserRepository) UpdateIsActive(ctx context.Context, id string, isActive bool) error {
	return r.db.WithContext(ctx).Model(&UserModel{}).Where("id = ?", id).Update("is_active", isActive).Error
}

func (r UserRepository) UpdateTwoFactorEnabled(ctx context.Context, id string, enabled bool) error {
	return r.db.WithContext(ctx).Model(&UserModel{}).Where("id = ?", id).Update("two_factor_enabled", enabled).Error
}
