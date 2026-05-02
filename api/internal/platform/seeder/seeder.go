package seeder

import (
	"context"
	"errors"
	"strings"

	appauth "api/internal/application/auth"
	appcommon "api/internal/application/common"
	userdomain "api/internal/domain/user"
	"gorm.io/gorm"
)

type Config struct {
	AdminName     string
	AdminEmail    string
	AdminPassword string
	UserName      string
	UserEmail     string
	UserPassword  string
}

type UserReader interface {
	GetByEmail(ctx context.Context, email string) (*userdomain.User, error)
}

type AuthRegistrar interface {
	Register(ctx context.Context, input appauth.RegisterInput) (*userdomain.User, error)
}

type Seeder struct {
	users UserReader
	auth  AuthRegistrar
	cfg   Config
}

func New(users UserReader, auth AuthRegistrar, cfg Config) Seeder {
	return Seeder{users: users, auth: auth, cfg: cfg}
}

func (s Seeder) Run(ctx context.Context) error {
	if err := s.ensureUser(ctx, s.cfg.AdminName, s.cfg.AdminEmail, s.cfg.AdminPassword, userdomain.RoleAdmin); err != nil {
		return err
	}

	if err := s.ensureUser(ctx, s.cfg.UserName, s.cfg.UserEmail, s.cfg.UserPassword, userdomain.RoleUser); err != nil {
		return err
	}

	return nil
}

func (s Seeder) ensureUser(ctx context.Context, name, email, password string, role userdomain.Role) error {
	if strings.TrimSpace(email) == "" || strings.TrimSpace(password) == "" {
		return nil
	}

	_, err := s.users.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err == nil {
		return nil
	}
	if !errors.Is(err, appcommon.ErrNotFound) && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	_, err = s.auth.Register(ctx, appauth.RegisterInput{
		Name:     name,
		Email:    email,
		Password: password,
		Role:     role,
	})
	if err != nil && !errors.Is(err, appcommon.ErrConflict) {
		return err
	}

	return nil
}
