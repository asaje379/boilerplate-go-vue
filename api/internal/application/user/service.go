package user

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	appcommon "api/internal/application/common"
	filedomain "api/internal/domain/file"
	userdomain "api/internal/domain/user"
	platformemail "api/internal/platform/email"
	platformid "api/internal/platform/id"

	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	users          userdomain.Repository
	files          filedomain.Repository
	events         appcommon.EventPublisher
	emailValidator platformemail.Validator
}

type ListInput struct {
	ActorRole userdomain.Role
	Params    appcommon.ListParams
}

type CreateInput struct {
	ActorRole          userdomain.Role
	Email              string
	Name               string
	Password           string
	WhatsAppPhone      string
	MustChangePassword bool
	PreferredLocale    userdomain.Locale
	Role               userdomain.Role
}

type UpdateInput struct {
	ActorRole       userdomain.Role
	Email           string
	Name            string
	PreferredLocale userdomain.Locale
	Role            userdomain.Role
	UserID          string
	WhatsAppPhone   string
}

type UpdateProfileInput struct {
	ActorID         string
	Email           string
	Name            string
	PreferredLocale userdomain.Locale
	WhatsAppPhone   string
}

type ChangePasswordInput struct {
	ActorID         string
	CurrentPassword string
	NewPassword     string
}

type UpdateSecurityInput struct {
	ActorID          string
	TwoFactorEnabled bool
}

type UpdateNotificationPrefsInput struct {
	ActorID        string
	NotifyEmail    bool
	NotifyInApp    bool
	NotifyWhatsapp bool
	WhatsAppPhone  string
}

func NewService(users userdomain.Repository, files filedomain.Repository, events appcommon.EventPublisher, emailValidator platformemail.Validator) Service {
	return Service{users: users, files: files, events: events, emailValidator: emailValidator}
}

func normalizeMutableFields(name, email, whatsAppPhone string, preferredLocale userdomain.Locale) (string, string, string, userdomain.Locale, error) {
	normalizedName := strings.TrimSpace(name)
	normalizedEmail := strings.TrimSpace(strings.ToLower(email))
	normalizedPhone := strings.TrimSpace(whatsAppPhone)
	normalizedLocale := preferredLocale.Normalize()

	if normalizedName == "" || normalizedEmail == "" {
		return "", "", "", "", fmt.Errorf("%w: name and email are required", appcommon.ErrValidation)
	}

	if !normalizedLocale.IsValid() {
		return "", "", "", "", fmt.Errorf("%w: invalid preferred locale", appcommon.ErrValidation)
	}
	if !userdomain.IsValidWhatsAppPhone(normalizedPhone) {
		return "", "", "", "", fmt.Errorf("%w: whatsapp phone must be in E.164 format", appcommon.ErrValidation)
	}

	return normalizedName, normalizedEmail, normalizedPhone, normalizedLocale, nil
}

func (s Service) GetByID(ctx context.Context, id string) (*userdomain.User, error) {
	result, err := s.users.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, appcommon.ErrNotFound) {
			return nil, appcommon.ErrNotFound
		}
		return nil, err
	}

	return result, nil
}

func (s Service) List(ctx context.Context, input ListInput) (*appcommon.PageResult[userdomain.User], error) {
	if input.ActorRole != userdomain.RoleAdmin {
		return nil, appcommon.ErrForbidden
	}

	params := input.Params.Normalize(20, 100, "createdAt")
	items, total, err := s.users.List(ctx, params)
	if err != nil {
		return nil, err
	}

	return &appcommon.PageResult[userdomain.User]{
		Items: items,
		Meta:  appcommon.NewPageMeta(params, total),
	}, nil
}

func (s Service) Create(ctx context.Context, input CreateInput) (*userdomain.User, error) {
	if input.ActorRole != userdomain.RoleAdmin {
		return nil, appcommon.ErrForbidden
	}

	name, email, whatsAppPhone, preferredLocale, err := normalizeMutableFields(input.Name, input.Email, input.WhatsAppPhone, input.PreferredLocale)
	if err != nil {
		return nil, err
	}

	password := strings.TrimSpace(input.Password)
	if len(password) < 8 {
		return nil, fmt.Errorf("%w: password must be at least 8 characters", appcommon.ErrValidation)
	}

	if !input.Role.IsValid() {
		return nil, fmt.Errorf("%w: invalid role", appcommon.ErrValidation)
	}
	if err := s.emailValidator.Validate(email); err != nil {
		return nil, fmt.Errorf("%w: %s", appcommon.ErrValidation, err.Error())
	}

	existing, err := s.users.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, appcommon.ErrNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("%w: email already registered", appcommon.ErrConflict)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &userdomain.User{
		ID:                 platformid.New(),
		Name:               name,
		Email:              email,
		WhatsAppPhone:      whatsAppPhone,
		PasswordHash:       string(hash),
		MustChangePassword: input.MustChangePassword,
		PreferredLocale:    preferredLocale,
		IsActive:           true,
		Role:               input.Role,
	}

	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}
	s.publish(ctx, appcommon.RealtimeEvent{
		ID:           platformid.New(),
		Type:         "user.created",
		Channel:      "users",
		AllowedRoles: []string{string(userdomain.RoleAdmin)},
		OccurredAt:   time.Now().UTC(),
		Data: map[string]any{
			"userId":             user.ID,
			"email":              user.Email,
			"name":               user.Name,
			"whatsappPhone":      user.WhatsAppPhone,
			"role":               user.Role,
			"preferredLocale":    user.PreferredLocale,
			"mustChangePassword": user.MustChangePassword,
		},
	})

	return user, nil
}

func (s Service) Update(ctx context.Context, input UpdateInput) (*userdomain.User, error) {
	if input.ActorRole != userdomain.RoleAdmin {
		return nil, appcommon.ErrForbidden
	}

	account, err := s.GetByID(ctx, input.UserID)
	if err != nil {
		return nil, err
	}

	name, email, whatsAppPhone, preferredLocale, err := normalizeMutableFields(input.Name, input.Email, input.WhatsAppPhone, input.PreferredLocale)
	if err != nil {
		return nil, err
	}

	if !input.Role.IsValid() {
		return nil, fmt.Errorf("%w: invalid role", appcommon.ErrValidation)
	}
	if err := s.emailValidator.Validate(email); err != nil {
		return nil, fmt.Errorf("%w: %s", appcommon.ErrValidation, err.Error())
	}

	existing, err := s.users.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, appcommon.ErrNotFound) {
		return nil, err
	}
	if existing != nil && existing.ID != account.ID {
		return nil, fmt.Errorf("%w: email already registered", appcommon.ErrConflict)
	}

	account.Name = name
	account.Email = email
	account.WhatsAppPhone = whatsAppPhone
	account.PreferredLocale = preferredLocale
	account.Role = input.Role

	if err := s.users.Update(ctx, account); err != nil {
		return nil, err
	}
	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "user.updated",
		Channel:        "users",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{account.ID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"userId":          account.ID,
			"email":           account.Email,
			"name":            account.Name,
			"whatsappPhone":   account.WhatsAppPhone,
			"role":            account.Role,
			"preferredLocale": account.PreferredLocale,
		},
	})

	return account, nil
}

func (s Service) UpdateCurrentProfile(ctx context.Context, input UpdateProfileInput) (*userdomain.User, error) {
	account, err := s.GetByID(ctx, input.ActorID)
	if err != nil {
		return nil, err
	}

	name, email, whatsAppPhone, preferredLocale, err := normalizeMutableFields(input.Name, input.Email, input.WhatsAppPhone, input.PreferredLocale)
	if err != nil {
		return nil, err
	}
	if err := s.emailValidator.Validate(email); err != nil {
		return nil, fmt.Errorf("%w: %s", appcommon.ErrValidation, err.Error())
	}

	existing, err := s.users.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, appcommon.ErrNotFound) {
		return nil, err
	}
	if existing != nil && existing.ID != account.ID {
		return nil, fmt.Errorf("%w: email already registered", appcommon.ErrConflict)
	}

	account.Name = name
	account.Email = email
	account.WhatsAppPhone = whatsAppPhone
	account.PreferredLocale = preferredLocale

	if err := s.users.Update(ctx, account); err != nil {
		return nil, err
	}
	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "user.profile.updated",
		Channel:        "users",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{account.ID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"userId":          account.ID,
			"email":           account.Email,
			"name":            account.Name,
			"whatsappPhone":   account.WhatsAppPhone,
			"preferredLocale": account.PreferredLocale,
		},
	})

	return account, nil
}

func (s Service) ChangePassword(ctx context.Context, input ChangePasswordInput) error {
	account, err := s.GetByID(ctx, input.ActorID)
	if err != nil {
		return err
	}

	currentPassword := strings.TrimSpace(input.CurrentPassword)
	newPassword := strings.TrimSpace(input.NewPassword)
	if currentPassword == "" || newPassword == "" {
		return fmt.Errorf("%w: current password and new password are required", appcommon.ErrValidation)
	}
	if len(newPassword) < 8 {
		return fmt.Errorf("%w: password must be at least 8 characters", appcommon.ErrValidation)
	}
	if bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(currentPassword)) != nil {
		return appcommon.ErrUnauthorized
	}
	if currentPassword == newPassword {
		return fmt.Errorf("%w: new password must be different from current password", appcommon.ErrValidation)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.users.UpdatePassword(ctx, account.ID, string(hash)); err != nil {
		return err
	}

	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "user.password.changed",
		Channel:        "users",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{account.ID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"userId": account.ID,
		},
	})

	return nil
}

func (s Service) UpdateSecurity(ctx context.Context, input UpdateSecurityInput) (*userdomain.User, error) {
	account, err := s.GetByID(ctx, input.ActorID)
	if err != nil {
		return nil, err
	}

	if err := s.users.UpdateTwoFactorEnabled(ctx, account.ID, input.TwoFactorEnabled); err != nil {
		return nil, err
	}
	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "user.security.updated",
		Channel:        "users",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{account.ID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"userId":           account.ID,
			"twoFactorEnabled": input.TwoFactorEnabled,
		},
	})

	return s.GetByID(ctx, account.ID)
}

func (s Service) UpdateNotificationPrefs(ctx context.Context, input UpdateNotificationPrefsInput) (*userdomain.User, error) {
	account, err := s.GetByID(ctx, input.ActorID)
	if err != nil {
		return nil, err
	}

	account.NotifyEmail = input.NotifyEmail
	account.NotifyInApp = input.NotifyInApp
	account.WhatsAppPhone = strings.TrimSpace(input.WhatsAppPhone)
	if !userdomain.IsValidWhatsAppPhone(account.WhatsAppPhone) {
		return nil, fmt.Errorf("%w: whatsapp phone must be in E.164 format", appcommon.ErrValidation)
	}
	account.NotifyWhatsapp = input.NotifyWhatsapp && account.WhatsAppPhone != ""

	if err := s.users.Update(ctx, account); err != nil {
		return nil, err
	}

	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "user.notifications.updated",
		Channel:        "users",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{account.ID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"userId":         account.ID,
			"notifyEmail":    account.NotifyEmail,
			"notifyInApp":    account.NotifyInApp,
			"notifyWhatsapp": account.NotifyWhatsapp,
			"whatsappPhone":  account.WhatsAppPhone,
		},
	})

	return s.GetByID(ctx, account.ID)
}

func (s Service) UpdateActiveStatus(ctx context.Context, actorRole userdomain.Role, userID string, isActive bool) (*userdomain.User, error) {
	if actorRole != userdomain.RoleAdmin {
		return nil, appcommon.ErrForbidden
	}

	account, err := s.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if err := s.users.UpdateIsActive(ctx, userID, isActive); err != nil {
		return nil, err
	}
	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "user.status.updated",
		Channel:        "users",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{account.ID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"userId":   account.ID,
			"isActive": isActive,
		},
	})

	account.IsActive = isActive
	return s.GetByID(ctx, account.ID)
}

func (s Service) UpdateProfilePhoto(ctx context.Context, userID, actorID string, actorRole userdomain.Role, fileID *string) (*userdomain.User, error) {
	if actorRole != userdomain.RoleAdmin && userID != actorID {
		return nil, appcommon.ErrForbidden
	}

	if fileID != nil {
		file, err := s.files.GetByID(ctx, *fileID)
		if err != nil {
			if errors.Is(err, appcommon.ErrNotFound) {
				return nil, appcommon.ErrNotFound
			}
			return nil, err
		}

		if actorRole != userdomain.RoleAdmin && file.UploadedByID != actorID {
			return nil, appcommon.ErrForbidden
		}
	}

	if err := s.users.UpdateProfilePhoto(ctx, userID, fileID); err != nil {
		return nil, err
	}
	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "user.profile-photo.updated",
		Channel:        "users",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{userID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"userId": userID,
			"fileId": fileID,
		},
	})

	return s.GetByID(ctx, userID)
}

func (s Service) publish(ctx context.Context, event appcommon.RealtimeEvent) {
	if s.events == nil {
		return
	}
	if err := s.events.Publish(ctx, event); err != nil {
		log.Printf("realtime event publish failed: type=%s err=%v", event.Type, err)
	}
}
