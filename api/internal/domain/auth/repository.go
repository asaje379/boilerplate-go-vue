package auth

import "context"

type RefreshTokenRepository interface {
	Create(ctx context.Context, token *RefreshToken) error
	GetByID(ctx context.Context, id string) (*RefreshToken, error)
	RevokeByID(ctx context.Context, id string) error
	RevokeByUserID(ctx context.Context, userID string) error
}

type EmailOTPRepository interface {
	Create(ctx context.Context, otp *EmailOTP) error
	GetLatestActiveByEmailAndPurpose(ctx context.Context, email string, purpose OTPPurpose) (*EmailOTP, error)
	Consume(ctx context.Context, id string) error
}
