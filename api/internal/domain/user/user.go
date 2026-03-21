package user

import "time"

type Role string
type Locale string

const (
	RoleAdmin Role   = "admin"
	RoleUser  Role   = "user"
	LocaleFR  Locale = "fr"
	LocaleEN  Locale = "en"
)

type User struct {
	ID                 string
	Name               string
	Email              string
	PasswordHash       string
	MustChangePassword bool
	PreferredLocale    Locale
	ProfilePhotoFileID *string
	TwoFactorEnabled   bool
	IsActive           bool
	Role               Role
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func (r Role) IsValid() bool {
	return r == RoleAdmin || r == RoleUser
}

func (l Locale) Normalize() Locale {
	switch l {
	case LocaleEN:
		return LocaleEN
	default:
		return LocaleFR
	}
}

func (l Locale) IsValid() bool {
	return l == LocaleFR || l == LocaleEN
}
