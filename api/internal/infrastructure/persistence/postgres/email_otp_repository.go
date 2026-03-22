package postgres

import (
	"context"
	"errors"

	appcommon "api/internal/application/common"
	authdomain "api/internal/domain/auth"

	"gorm.io/gorm"
)

type EmailOTPRepository struct {
	db *gorm.DB
}

func NewEmailOTPRepository(db *gorm.DB) EmailOTPRepository {
	return EmailOTPRepository{db: db}
}

func (r EmailOTPRepository) Create(ctx context.Context, otp *authdomain.EmailOTP) error {
	model := fromDomainEmailOTP(otp)
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}
	*otp = *model.toDomain()
	return nil
}

func (r EmailOTPRepository) GetLatestActiveByEmailAndPurpose(ctx context.Context, email string, purpose authdomain.OTPPurpose) (*authdomain.EmailOTP, error) {
	var model EmailOTPModel
	if err := r.db.WithContext(ctx).
		Where("email = ? AND purpose = ? AND consumed_at IS NULL", email, purpose).
		Order("created_at DESC").
		First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, appcommon.ErrNotFound
		}
		return nil, err
	}

	return model.toDomain(), nil
}

func (r EmailOTPRepository) Consume(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&EmailOTPModel{}).Where("id = ? AND consumed_at IS NULL", id).Update("consumed_at", gorm.Expr("NOW()")).Error
}
