package auth

import "time"

type OTPPurpose string

const (
	OTPPurposeLogin2FA      OTPPurpose = "login_2fa"
	OTPPurposePasswordReset OTPPurpose = "password_reset"
)

type EmailOTP struct {
	ID         string
	Email      string
	UserID     *string
	Purpose    OTPPurpose
	CodeHash   string
	ExpiresAt  time.Time
	ConsumedAt *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (o EmailOTP) IsExpired(now time.Time) bool {
	return now.After(o.ExpiresAt)
}

func (o EmailOTP) IsConsumed() bool {
	return o.ConsumedAt != nil
}
