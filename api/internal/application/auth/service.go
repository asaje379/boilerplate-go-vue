package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	appcommon "api/internal/application/common"
	authdomain "api/internal/domain/auth"
	userdomain "api/internal/domain/user"
	platformemail "api/internal/platform/email"
	platformid "api/internal/platform/id"
	platformmailer "api/internal/platform/mailer"
	mailtemplate "api/internal/platform/mailer/template"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	users               userdomain.Repository
	refreshTokens       authdomain.RefreshTokenRepository
	otps                authdomain.EmailOTPRepository
	emailDispatcher     EmailDispatcher
	jwtSecret           []byte
	accessTokenTTL      time.Duration
	refreshTokenTTL     time.Duration
	loginOTPTTL         time.Duration
	passwordResetOTPTTL time.Duration
	emailValidator      platformemail.Validator
	defaultLocale       userdomain.Locale
}

type EmailDispatcher interface {
	Dispatch(ctx context.Context, message platformmailer.Message) error
}

type RegisterInput struct {
	Name            string
	Email           string
	Password        string
	WhatsAppPhone   string
	Role            userdomain.Role
	PreferredLocale userdomain.Locale
}

type LoginInput struct {
	Email    string
	Password string
}

type VerifyLoginOTPInput struct {
	Email string
	OTP   string
}

type ForgotPasswordInput struct {
	Email string
}

type ResetPasswordInput struct {
	Email       string
	OTP         string
	NewPassword string
}

type RefreshInput struct {
	RefreshToken string
}

type LogoutInput struct {
	RefreshToken string
}

type SetupStatusResult struct {
	HasAdminUsers bool
	RequiresSetup bool
}

type TokenClaims struct {
	UserID  string          `json:"userId"`
	Role    userdomain.Role `json:"role"`
	Email   string          `json:"email"`
	Type    string          `json:"type"`
	TokenID string          `json:"tokenId,omitempty"`
	jwt.RegisteredClaims
}

type AuthResult struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Time
	User         *userdomain.User
}

type LoginChallengeResult struct {
	AccessToken  string
	Email        string
	RefreshToken string
	OTPExpiresAt time.Time
	Message      string
	User         *userdomain.User
}

const maxPasswordLength = 72

type ServiceConfig struct {
	Users               userdomain.Repository
	RefreshTokens       authdomain.RefreshTokenRepository
	OTPs                authdomain.EmailOTPRepository
	EmailDispatcher     EmailDispatcher
	EmailValidator      platformemail.Validator
	JWTSecret           string
	AccessTokenTTL      time.Duration
	RefreshTokenTTL     time.Duration
	LoginOTPTTL         time.Duration
	PasswordResetOTPTTL time.Duration
	DefaultLocale       userdomain.Locale
}

func NewService(cfg ServiceConfig) Service {
	return Service{
		users:               cfg.Users,
		refreshTokens:       cfg.RefreshTokens,
		otps:                cfg.OTPs,
		emailDispatcher:     cfg.EmailDispatcher,
		emailValidator:      cfg.EmailValidator,
		jwtSecret:           []byte(cfg.JWTSecret),
		accessTokenTTL:      cfg.AccessTokenTTL,
		refreshTokenTTL:     cfg.RefreshTokenTTL,
		loginOTPTTL:         cfg.LoginOTPTTL,
		passwordResetOTPTTL: cfg.PasswordResetOTPTTL,
		defaultLocale:       cfg.DefaultLocale.Normalize(),
	}
}

func (s Service) SetupStatus(ctx context.Context) (*SetupStatusResult, error) {
	adminCount, err := s.users.CountAdmins(ctx)
	if err != nil {
		return nil, err
	}

	return &SetupStatusResult{
		HasAdminUsers: adminCount > 0,
		RequiresSetup: adminCount == 0,
	}, nil
}

func (s Service) BootstrapFirstAdmin(ctx context.Context, input RegisterInput) (*AuthResult, error) {
	createdUser, err := s.buildRegisteredUser(input, userdomain.RoleAdmin)
	if err != nil {
		return nil, err
	}
	created, err := s.users.CreateFirstAdminIfNone(ctx, createdUser)
	if err != nil {
		return nil, err
	}
	if !created {
		return nil, fmt.Errorf("%w: initial setup already completed", appcommon.ErrConflict)
	}

	return s.issueTokenPair(ctx, createdUser)
}

func (s Service) Register(ctx context.Context, input RegisterInput) (*userdomain.User, error) {
	newUser, err := s.buildRegisteredUser(input, input.Role)
	if err != nil {
		return nil, err
	}

	existing, err := s.users.GetByEmail(ctx, newUser.Email)
	if err != nil && !errors.Is(err, appcommon.ErrNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("%w: email already registered", appcommon.ErrConflict)
	}

	if err := s.users.Create(ctx, newUser); err != nil {
		return nil, err
	}
	return newUser, nil
}

func (s Service) buildRegisteredUser(input RegisterInput, requestedRole userdomain.Role) (*userdomain.User, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.TrimSpace(strings.ToLower(input.Email))
	password := strings.TrimSpace(input.Password)
	role := requestedRole
	preferredLocale := input.PreferredLocale.Normalize()
	if role == "" {
		role = userdomain.RoleUser
	}
	if preferredLocale == "" {
		preferredLocale = s.defaultLocale
	}

	if name == "" || email == "" || password == "" {
		return nil, fmt.Errorf("%w: name, email and password are required", appcommon.ErrValidation)
	}
	if len(password) < 8 {
		return nil, fmt.Errorf("%w: password must be at least 8 characters", appcommon.ErrValidation)
	}
	if len(password) > maxPasswordLength {
		return nil, fmt.Errorf("%w: password must not exceed %d characters", appcommon.ErrValidation, maxPasswordLength)
	}
	if !role.IsValid() {
		return nil, fmt.Errorf("%w: invalid role", appcommon.ErrValidation)
	}
	if !userdomain.IsValidWhatsAppPhone(strings.TrimSpace(input.WhatsAppPhone)) {
		return nil, fmt.Errorf("%w: whatsapp phone must be in E.164 format", appcommon.ErrValidation)
	}
	if err := s.emailValidator.Validate(email); err != nil {
		return nil, fmt.Errorf("%w: %s", appcommon.ErrValidation, err.Error())
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	newUser := &userdomain.User{ID: platformid.New(), Name: name, Email: email, PasswordHash: string(hash), PreferredLocale: preferredLocale, Role: role}
	newUser.WhatsAppPhone = strings.TrimSpace(input.WhatsAppPhone)
	newUser.TwoFactorEnabled = false
	return newUser, nil
}

func (s Service) Login(ctx context.Context, input LoginInput) (*LoginChallengeResult, error) {
	email := strings.TrimSpace(strings.ToLower(input.Email))
	password := strings.TrimSpace(input.Password)
	if email == "" || password == "" {
		return nil, fmt.Errorf("%w: email and password are required", appcommon.ErrValidation)
	}

	account, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, appcommon.ErrNotFound) {
			return nil, appcommon.ErrUnauthorized
		}
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(password)) != nil {
		return nil, appcommon.ErrUnauthorized
	}
	if !account.IsActive {
		return nil, appcommon.ErrUnauthorized
	}
	if !account.TwoFactorEnabled {
		authResult, err := s.issueTokenPair(ctx, account)
		if err != nil {
			return nil, err
		}

		return &LoginChallengeResult{
			AccessToken:  authResult.AccessToken,
			Email:        account.Email,
			RefreshToken: authResult.RefreshToken,
			OTPExpiresAt: authResult.ExpiresAt,
			Message:      loginMessage(account.MustChangePassword),
			User:         authResult.User,
		}, nil
	}

	expiresAt, err := s.issueOTP(ctx, account, authdomain.OTPPurposeLogin2FA, s.loginOTPTTL)
	if err != nil {
		return nil, err
	}

	return &LoginChallengeResult{Email: account.Email, OTPExpiresAt: expiresAt, Message: loginOTPMessage(account.MustChangePassword), User: account}, nil
}

func loginMessage(mustChangePassword bool) string {
	if mustChangePassword {
		return "Login successful. You must change your password before continuing."
	}

	return "Login successful"
}

func loginOTPMessage(mustChangePassword bool) string {
	if mustChangePassword {
		return "OTP sent by email. You will need to change your password after sign in."
	}

	return "OTP sent by email"
}

func (s Service) VerifyLoginOTP(ctx context.Context, input VerifyLoginOTPInput) (*AuthResult, error) {
	account, otp, err := s.verifyOTP(ctx, strings.ToLower(strings.TrimSpace(input.Email)), strings.TrimSpace(input.OTP), authdomain.OTPPurposeLogin2FA)
	if err != nil {
		return nil, err
	}
	if err := s.otps.Consume(ctx, otp.ID); err != nil {
		return nil, err
	}
	return s.issueTokenPair(ctx, account)
}

func (s Service) ForgotPassword(ctx context.Context, input ForgotPasswordInput) error {
	email := strings.TrimSpace(strings.ToLower(input.Email))
	if email == "" {
		return fmt.Errorf("%w: email is required", appcommon.ErrValidation)
	}

	account, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, appcommon.ErrNotFound) {
			return nil
		}
		return err
	}

	_, err = s.issueOTP(ctx, account, authdomain.OTPPurposePasswordReset, s.passwordResetOTPTTL)
	return err
}

func (s Service) ResetPassword(ctx context.Context, input ResetPasswordInput) error {
	email := strings.TrimSpace(strings.ToLower(input.Email))
	otpCode := strings.TrimSpace(input.OTP)
	newPassword := strings.TrimSpace(input.NewPassword)
	if email == "" || otpCode == "" || newPassword == "" {
		return fmt.Errorf("%w: email, otp and new password are required", appcommon.ErrValidation)
	}
	if len(newPassword) < 8 {
		return fmt.Errorf("%w: password must be at least 8 characters", appcommon.ErrValidation)
	}
	if len(newPassword) > maxPasswordLength {
		return fmt.Errorf("%w: password must not exceed %d characters", appcommon.ErrValidation, maxPasswordLength)
	}

	account, otp, err := s.verifyOTP(ctx, email, otpCode, authdomain.OTPPurposePasswordReset)
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := s.users.UpdatePassword(ctx, account.ID, string(hash)); err != nil {
		return err
	}
	if err := s.refreshTokens.RevokeByUserID(ctx, account.ID); err != nil {
		return err
	}
	return s.otps.Consume(ctx, otp.ID)
}

func (s Service) Refresh(ctx context.Context, input RefreshInput) (*AuthResult, error) {
	claims, err := s.parseToken(input.RefreshToken, "refresh")
	if err != nil {
		return nil, err
	}
	storedToken, err := s.refreshTokens.GetByID(ctx, claims.TokenID)
	if err != nil {
		if errors.Is(err, appcommon.ErrNotFound) {
			return nil, appcommon.ErrUnauthorized
		}
		return nil, err
	}
	if storedToken.IsRevoked() || time.Now().After(storedToken.ExpiresAt) {
		return nil, appcommon.ErrUnauthorized
	}
	if claims.UserID != storedToken.UserID {
		return nil, appcommon.ErrUnauthorized
	}
	account, err := s.users.GetByID(ctx, storedToken.UserID)
	if err != nil {
		if errors.Is(err, appcommon.ErrNotFound) {
			return nil, appcommon.ErrUnauthorized
		}
		return nil, err
	}
	if !account.IsActive {
		return nil, appcommon.ErrUnauthorized
	}
	if err := s.refreshTokens.RevokeByID(ctx, storedToken.ID); err != nil {
		return nil, err
	}
	return s.issueTokenPair(ctx, account)
}

func (s Service) Logout(ctx context.Context, input LogoutInput) error {
	claims, err := s.parseToken(input.RefreshToken, "refresh")
	if err != nil {
		return err
	}
	storedToken, err := s.refreshTokens.GetByID(ctx, claims.TokenID)
	if err != nil {
		if errors.Is(err, appcommon.ErrNotFound) {
			return appcommon.ErrUnauthorized
		}
		return err
	}
	if storedToken.IsRevoked() {
		return nil
	}
	return s.refreshTokens.RevokeByID(ctx, storedToken.ID)
}

func (s Service) ParseToken(ctx context.Context, token string) (*TokenClaims, error) {
	claims, err := s.parseToken(token, "access")
	if err != nil {
		return nil, err
	}

	account, err := s.users.GetByID(ctx, claims.UserID)
	if err != nil || !account.IsActive {
		return nil, appcommon.ErrUnauthorized
	}
	claims.Role = account.Role
	claims.Email = account.Email

	return claims, nil
}

func (s Service) parseToken(token string, expectedType string) (*TokenClaims, error) {
	parsed, err := jwt.ParseWithClaims(token, &TokenClaims{}, func(_ *jwt.Token) (any, error) { return s.jwtSecret, nil }, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, appcommon.ErrUnauthorized
	}
	claims, ok := parsed.Claims.(*TokenClaims)
	if !ok || !parsed.Valid || claims.Type != expectedType {
		return nil, appcommon.ErrUnauthorized
	}
	return claims, nil
}

func (s Service) issueTokenPair(ctx context.Context, account *userdomain.User) (*AuthResult, error) {
	accessExpiresAt := time.Now().Add(s.accessTokenTTL)
	claims := TokenClaims{UserID: account.ID, Role: account.Role, Email: account.Email, Type: "access", RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(accessExpiresAt), IssuedAt: jwt.NewNumericDate(time.Now()), Subject: account.ID}}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshTokenID, err := newTokenID()
	if err != nil {
		return nil, err
	}
	refreshExpiresAt := time.Now().Add(s.refreshTokenTTL)
	refreshClaims := TokenClaims{UserID: account.ID, Role: account.Role, Email: account.Email, Type: "refresh", TokenID: refreshTokenID, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(refreshExpiresAt), IssuedAt: jwt.NewNumericDate(time.Now()), Subject: account.ID, ID: refreshTokenID}}
	refreshJWT := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	signedRefresh, err := refreshJWT.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}
	refreshToken := &authdomain.RefreshToken{ID: refreshTokenID, UserID: account.ID, ExpiresAt: refreshExpiresAt}
	if err := s.refreshTokens.Create(ctx, refreshToken); err != nil {
		return nil, err
	}
	return &AuthResult{AccessToken: signed, RefreshToken: signedRefresh, ExpiresAt: accessExpiresAt, User: account}, nil
}

func (s Service) issueOTP(ctx context.Context, account *userdomain.User, purpose authdomain.OTPPurpose, ttl time.Duration) (time.Time, error) {
	code, err := newOTPCode()
	if err != nil {
		return time.Time{}, err
	}
	userID := account.ID
	expiresAt := time.Now().Add(ttl)
	otp := &authdomain.EmailOTP{ID: platformid.New(), Email: account.Email, UserID: &userID, Purpose: purpose, CodeHash: s.hashOTP(code), ExpiresAt: expiresAt}
	if err := s.otps.Create(ctx, otp); err != nil {
		return time.Time{}, err
	}
	minutes := int(ttl.Minutes())
	tpl, err := mailtemplate.BuildOTP(mailtemplate.OTPTemplateInput{
		Locale:           account.PreferredLocale.Normalize(),
		RecipientName:    account.Name,
		Code:             code,
		ExpiresInMinutes: minutes,
		Purpose:          string(purpose),
	})
	if err != nil {
		return time.Time{}, err
	}
	message := platformmailer.Message{
		ToEmail:  account.Email,
		ToName:   account.Name,
		Subject:  tpl.Subject,
		HTMLBody: tpl.HTMLBody,
		TextBody: tpl.TextBody,
	}
	if err := s.emailDispatcher.Dispatch(ctx, message); err != nil {
		return time.Time{}, err
	}
	return expiresAt, nil
}

func (s Service) verifyOTP(ctx context.Context, email, code string, purpose authdomain.OTPPurpose) (*userdomain.User, *authdomain.EmailOTP, error) {
	if email == "" || code == "" {
		return nil, nil, fmt.Errorf("%w: email and otp are required", appcommon.ErrValidation)
	}
	otp, err := s.otps.GetLatestActiveByEmailAndPurpose(ctx, email, purpose)
	if err != nil {
		if errors.Is(err, appcommon.ErrNotFound) {
			return nil, nil, appcommon.ErrUnauthorized
		}
		return nil, nil, err
	}
	if otp.IsConsumed() || otp.IsExpired(time.Now()) || otp.CodeHash != s.hashOTP(code) || otp.UserID == nil {
		return nil, nil, appcommon.ErrUnauthorized
	}
	account, err := s.users.GetByID(ctx, *otp.UserID)
	if err != nil {
		if errors.Is(err, appcommon.ErrNotFound) {
			return nil, nil, appcommon.ErrUnauthorized
		}
		return nil, nil, err
	}
	return account, otp, nil
}

func (s Service) hashOTP(code string) string {
	sum := sha256.Sum256(append(s.jwtSecret, []byte(code)...))
	return hex.EncodeToString(sum[:])
}

func newTokenID() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

func newOTPCode() (string, error) {
	buffer := make([]byte, 4)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	value := int(buffer[0])<<24 | int(buffer[1])<<16 | int(buffer[2])<<8 | int(buffer[3])
	if value < 0 {
		value = -value
	}
	return fmt.Sprintf("%06d", value%1000000), nil
}
