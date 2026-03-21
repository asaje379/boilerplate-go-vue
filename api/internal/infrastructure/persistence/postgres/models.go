package postgres

import (
	authdomain "api/internal/domain/auth"
	filedomain "api/internal/domain/file"
	userdomain "api/internal/domain/user"
	"time"
)

type UserModel struct {
	ID                 string            `gorm:"primaryKey;size:32"`
	Name               string            `gorm:"size:120;not null"`
	Email              string            `gorm:"size:255;not null;uniqueIndex"`
	PasswordHash       string            `gorm:"size:255;not null"`
	MustChangePassword bool              `gorm:"not null;default:false"`
	PreferredLocale    userdomain.Locale `gorm:"type:varchar(8);not null;default:'fr'"`
	ProfilePhotoFileID *string           `gorm:"size:32"`
	TwoFactorEnabled   bool              `gorm:"not null;default:false"`
	IsActive           bool              `gorm:"not null;default:true;index"`
	Role               userdomain.Role   `gorm:"type:varchar(20);not null;index"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func (UserModel) TableName() string {
	return "users"
}

func (m UserModel) toDomain() *userdomain.User {
	return &userdomain.User{
		ID:                 m.ID,
		Name:               m.Name,
		Email:              m.Email,
		PasswordHash:       m.PasswordHash,
		MustChangePassword: m.MustChangePassword,
		PreferredLocale:    m.PreferredLocale,
		ProfilePhotoFileID: m.ProfilePhotoFileID,
		TwoFactorEnabled:   m.TwoFactorEnabled,
		IsActive:           m.IsActive,
		Role:               m.Role,
		CreatedAt:          m.CreatedAt,
		UpdatedAt:          m.UpdatedAt,
	}
}

func fromDomainUser(u *userdomain.User) *UserModel {
	return &UserModel{
		ID:                 u.ID,
		Name:               u.Name,
		Email:              u.Email,
		PasswordHash:       u.PasswordHash,
		MustChangePassword: u.MustChangePassword,
		PreferredLocale:    u.PreferredLocale,
		ProfilePhotoFileID: u.ProfilePhotoFileID,
		TwoFactorEnabled:   u.TwoFactorEnabled,
		IsActive:           u.IsActive,
		Role:               u.Role,
		CreatedAt:          u.CreatedAt,
		UpdatedAt:          u.UpdatedAt,
	}
}

type RefreshTokenModel struct {
	ID        string `gorm:"primaryKey;size:64"`
	UserID    string `gorm:"size:32;not null;index"`
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}

type EmailOTPModel struct {
	ID         string                `gorm:"primaryKey;size:32"`
	Email      string                `gorm:"size:255;not null;index"`
	UserID     *string               `gorm:"size:32;index"`
	Purpose    authdomain.OTPPurpose `gorm:"type:varchar(50);not null;index"`
	CodeHash   string                `gorm:"size:255;not null"`
	ExpiresAt  time.Time
	ConsumedAt *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (EmailOTPModel) TableName() string {
	return "email_otps"
}

func (m EmailOTPModel) toDomain() *authdomain.EmailOTP {
	return &authdomain.EmailOTP{
		ID:         m.ID,
		Email:      m.Email,
		UserID:     m.UserID,
		Purpose:    m.Purpose,
		CodeHash:   m.CodeHash,
		ExpiresAt:  m.ExpiresAt,
		ConsumedAt: m.ConsumedAt,
		CreatedAt:  m.CreatedAt,
		UpdatedAt:  m.UpdatedAt,
	}
}

func fromDomainEmailOTP(otp *authdomain.EmailOTP) *EmailOTPModel {
	return &EmailOTPModel{
		ID:         otp.ID,
		Email:      otp.Email,
		UserID:     otp.UserID,
		Purpose:    otp.Purpose,
		CodeHash:   otp.CodeHash,
		ExpiresAt:  otp.ExpiresAt,
		ConsumedAt: otp.ConsumedAt,
		CreatedAt:  otp.CreatedAt,
		UpdatedAt:  otp.UpdatedAt,
	}
}

func (RefreshTokenModel) TableName() string {
	return "refresh_tokens"
}

func (m RefreshTokenModel) toDomain() *authdomain.RefreshToken {
	return &authdomain.RefreshToken{
		ID:        m.ID,
		UserID:    m.UserID,
		ExpiresAt: m.ExpiresAt,
		RevokedAt: m.RevokedAt,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

func fromDomainRefreshToken(token *authdomain.RefreshToken) *RefreshTokenModel {
	return &RefreshTokenModel{
		ID:        token.ID,
		UserID:    token.UserID,
		ExpiresAt: token.ExpiresAt,
		RevokedAt: token.RevokedAt,
		CreatedAt: token.CreatedAt,
		UpdatedAt: token.UpdatedAt,
	}
}

type FileModel struct {
	ID           string                `gorm:"primaryKey;size:32"`
	OriginalName string                `gorm:"size:255;not null"`
	StoredName   string                `gorm:"size:255;not null"`
	StorageKey   string                `gorm:"size:1024;not null;uniqueIndex"`
	Bucket       string                `gorm:"size:255;not null"`
	Provider     string                `gorm:"size:50;not null;index"`
	ContentType  string                `gorm:"size:255;not null"`
	SizeBytes    int64                 `gorm:"not null"`
	Visibility   filedomain.Visibility `gorm:"type:varchar(20);not null;index"`
	UploadedByID string                `gorm:"size:32;not null;index"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (FileModel) TableName() string {
	return "files"
}

func (m FileModel) toDomain() *filedomain.File {
	return &filedomain.File{
		ID:           m.ID,
		OriginalName: m.OriginalName,
		StoredName:   m.StoredName,
		StorageKey:   m.StorageKey,
		Bucket:       m.Bucket,
		Provider:     m.Provider,
		ContentType:  m.ContentType,
		SizeBytes:    m.SizeBytes,
		Visibility:   m.Visibility,
		UploadedByID: m.UploadedByID,
		CreatedAt:    m.CreatedAt,
		UpdatedAt:    m.UpdatedAt,
	}
}

func fromDomainFile(file *filedomain.File) *FileModel {
	return &FileModel{
		ID:           file.ID,
		OriginalName: file.OriginalName,
		StoredName:   file.StoredName,
		StorageKey:   file.StorageKey,
		Bucket:       file.Bucket,
		Provider:     file.Provider,
		ContentType:  file.ContentType,
		SizeBytes:    file.SizeBytes,
		Visibility:   file.Visibility,
		UploadedByID: file.UploadedByID,
		CreatedAt:    file.CreatedAt,
		UpdatedAt:    file.UpdatedAt,
	}
}
