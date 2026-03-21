package auth

import "time"

type RefreshToken struct {
	ID        string
	UserID    string
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (t RefreshToken) IsRevoked() bool {
	return t.RevokedAt != nil
}
