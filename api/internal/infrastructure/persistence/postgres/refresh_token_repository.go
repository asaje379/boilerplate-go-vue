package postgres

import (
	"context"
	"errors"
	"time"

	appcommon "api/internal/application/common"
	authdomain "api/internal/domain/auth"

	"gorm.io/gorm"
)

type RefreshTokenRepository struct {
	db *gorm.DB
}

func NewRefreshTokenRepository(db *gorm.DB) RefreshTokenRepository {
	return RefreshTokenRepository{db: db}
}

func (r RefreshTokenRepository) Create(ctx context.Context, token *authdomain.RefreshToken) error {
	model := fromDomainRefreshToken(token)
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}

	*token = *model.toDomain()
	return nil
}

func (r RefreshTokenRepository) GetByID(ctx context.Context, id string) (*authdomain.RefreshToken, error) {
	var model RefreshTokenModel
	if err := r.db.WithContext(ctx).First(&model, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, appcommon.ErrNotFound
		}
		return nil, err
	}

	return model.toDomain(), nil
}

func (r RefreshTokenRepository) RevokeByID(ctx context.Context, id string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&RefreshTokenModel{}).Where("id = ? AND revoked_at IS NULL", id).Update("revoked_at", &now).Error
}

func (r RefreshTokenRepository) RevokeByUserID(ctx context.Context, userID string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&RefreshTokenModel{}).Where("user_id = ? AND revoked_at IS NULL", userID).Update("revoked_at", &now).Error
}
