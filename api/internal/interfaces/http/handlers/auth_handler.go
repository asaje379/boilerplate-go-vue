package handlers

import (
	"net/http"

	appauth "api/internal/application/auth"
	appfile "api/internal/application/file"
	userdomain "api/internal/domain/user"
	"api/internal/interfaces/http/presenter"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService appauth.Service
	fileService appfile.Service
}

type RegisterRequest struct {
	Name            string `json:"name" binding:"required" example:"Jane Doe"`
	Email           string `json:"email" binding:"required,email" example:"jane@example.com"`
	Password        string `json:"password" binding:"required,min=8" example:"supersecret"`
	PreferredLocale string `json:"preferredLocale,omitempty" example:"fr" enums:"fr,en"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email" example:"jane@example.com"`
	Password string `json:"password" binding:"required" example:"supersecret"`
}

type VerifyLoginOTPRequest struct {
	Email string `json:"email" binding:"required,email" example:"jane@example.com"`
	OTP   string `json:"otp" binding:"required,len=6" example:"123456"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email" example:"jane@example.com"`
}

type ResetPasswordRequest struct {
	Email       string `json:"email" binding:"required,email" example:"jane@example.com"`
	OTP         string `json:"otp" binding:"required,len=6" example:"123456"`
	NewPassword string `json:"newPassword" binding:"required,min=8" example:"newsecret123"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type BootstrapFirstAdminRequest struct {
	Name            string `json:"name" binding:"required" example:"Jane Doe"`
	Email           string `json:"email" binding:"required,email" example:"jane@example.com"`
	Password        string `json:"password" binding:"required,min=8" example:"supersecret123"`
	PreferredLocale string `json:"preferredLocale,omitempty" example:"fr" enums:"fr,en"`
}

type AuthResponse struct {
	AccessToken  string                 `json:"accessToken"`
	RefreshToken string                 `json:"refreshToken"`
	ExpiresAt    string                 `json:"expiresAt" example:"2026-03-16T18:00:00Z"`
	User         presenter.UserResponse `json:"user"`
}

type ErrorResponse struct {
	Error string `json:"error" example:"validation error"`
}

type LoginChallengeResponse struct {
	AccessToken  string                  `json:"accessToken,omitempty"`
	Email        string                  `json:"email"`
	ExpiresAt    string                  `json:"expiresAt,omitempty" example:"2026-03-16T18:00:00Z"`
	RefreshToken string                  `json:"refreshToken,omitempty"`
	RequiresOTP  bool                    `json:"requiresOtp"`
	OTPExpiresAt string                  `json:"otpExpiresAt"`
	Message      string                  `json:"message"`
	User         *presenter.UserResponse `json:"user,omitempty"`
}

type SetupStatusResponse struct {
	HasAdminUsers bool `json:"hasAdminUsers"`
	RequiresSetup bool `json:"requiresSetup"`
}

func NewAuthHandler(authService appauth.Service, fileService appfile.Service) AuthHandler {
	return AuthHandler{authService: authService, fileService: fileService}
}

// SetupStatus godoc
// @Summary Setup status
// @Description Returns whether the application still requires creation of the first admin.
// @Tags auth
// @Produce json
// @Success 200 {object} SetupStatusResponse
// @Router /api/v1/auth/setup-status [get]
func (h AuthHandler) SetupStatus(c *gin.Context) {
	result, err := h.authService.SetupStatus(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, SetupStatusResponse{
		HasAdminUsers: result.HasAdminUsers,
		RequiresSetup: result.RequiresSetup,
	})
}

// BootstrapFirstAdmin godoc
// @Summary Bootstrap first admin
// @Description Creates the first administrator account when the application has not been initialized yet.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body BootstrapFirstAdminRequest true "Bootstrap first admin payload"
// @Success 201 {object} AuthResponse
// @Failure 400 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /api/v1/auth/bootstrap-first-admin [post]
func (h AuthHandler) BootstrapFirstAdmin(c *gin.Context) {
	var request BootstrapFirstAdminRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	result, err := h.authService.BootstrapFirstAdmin(c.Request.Context(), appauth.RegisterInput{
		Name:            request.Name,
		Email:           request.Email,
		Password:        request.Password,
		Role:            userdomain.RoleAdmin,
		PreferredLocale: userdomain.Locale(request.PreferredLocale),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresAt:    result.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		User:         h.toUserResponse(c, result.User),
	})
}

// Register godoc
// @Summary Register a user
// @Description Creates a user account. Role defaults to `user`.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body RegisterRequest true "Register payload"
// @Success 201 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /api/v1/auth/register [post]
func (h AuthHandler) Register(c *gin.Context) {
	var request RegisterRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	createdUser, err := h.authService.Register(c.Request.Context(), appauth.RegisterInput{
		Name:            request.Name,
		Email:           request.Email,
		Password:        request.Password,
		Role:            userdomain.RoleUser,
		PreferredLocale: userdomain.Locale(request.PreferredLocale),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, h.toUserResponse(c, createdUser))
}

// Login godoc
// @Summary Login
// @Description Authenticates a user and sends a 2FA OTP by email.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body LoginRequest true "Login payload"
// @Success 200 {object} LoginChallengeResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/auth/login [post]
func (h AuthHandler) Login(c *gin.Context) {
	var request LoginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	result, err := h.authService.Login(c.Request.Context(), appauth.LoginInput{Email: request.Email, Password: request.Password})
	if err != nil {
		h.handleError(c, err)
		return
	}
	var userResponse *presenter.UserResponse
	expiresAt := ""
	if result.User != nil {
		mapped := h.toUserResponse(c, result.User)
		userResponse = &mapped
	}
	if !result.OTPExpiresAt.IsZero() {
		expiresAt = result.OTPExpiresAt.Format("2006-01-02T15:04:05Z07:00")
	}

	c.JSON(http.StatusOK, LoginChallengeResponse{
		AccessToken:  result.AccessToken,
		Email:        result.Email,
		ExpiresAt:    expiresAt,
		Message:      result.Message,
		RefreshToken: result.RefreshToken,
		RequiresOTP:  result.AccessToken == "",
		OTPExpiresAt: expiresAt,
		User:         userResponse,
	})
}

// VerifyLoginOTP godoc
// @Summary Verify email OTP
// @Description Verifies the login 2FA OTP and returns JWT tokens.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body VerifyLoginOTPRequest true "Verify login OTP payload"
// @Success 200 {object} AuthResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/auth/verify-otp [post]
func (h AuthHandler) VerifyLoginOTP(c *gin.Context) {
	var request VerifyLoginOTPRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	result, err := h.authService.VerifyLoginOTP(c.Request.Context(), appauth.VerifyLoginOTPInput{Email: request.Email, OTP: request.OTP})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, AuthResponse{AccessToken: result.AccessToken, RefreshToken: result.RefreshToken, ExpiresAt: result.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"), User: h.toUserResponse(c, result.User)})
}

// ForgotPassword godoc
// @Summary Forgot password
// @Description Sends a password reset OTP by email if the account exists.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body ForgotPasswordRequest true "Forgot password payload"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/auth/forgot-password [post]
func (h AuthHandler) ForgotPassword(c *gin.Context) {
	var request ForgotPasswordRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.authService.ForgotPassword(c.Request.Context(), appauth.ForgotPasswordInput{Email: request.Email}); err != nil {
		h.handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// ResetPassword godoc
// @Summary Reset password
// @Description Resets the password using the OTP sent by email.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body ResetPasswordRequest true "Reset password payload"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/auth/reset-password [post]
func (h AuthHandler) ResetPassword(c *gin.Context) {
	var request ResetPasswordRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.authService.ResetPassword(c.Request.Context(), appauth.ResetPasswordInput{Email: request.Email, OTP: request.OTP, NewPassword: request.NewPassword}); err != nil {
		h.handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// Refresh godoc
// @Summary Refresh tokens
// @Description Rotates the refresh token and returns a new token pair.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body RefreshRequest true "Refresh payload"
// @Success 200 {object} AuthResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/auth/refresh [post]
func (h AuthHandler) Refresh(c *gin.Context) {
	var request RefreshRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	result, err := h.authService.Refresh(c.Request.Context(), appauth.RefreshInput{RefreshToken: request.RefreshToken})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		ExpiresAt:    result.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		User:         h.toUserResponse(c, result.User),
	})
}

func (h AuthHandler) toUserResponse(c *gin.Context, user *userdomain.User) presenter.UserResponse {
	if user == nil {
		return presenter.UserResponse{}
	}

	profilePhotoURL := ""
	if user.ProfilePhotoFileID != nil && *user.ProfilePhotoFileID != "" {
		if url, _, err := h.fileService.GetAccessibleDownloadURL(c.Request.Context(), *user.ProfilePhotoFileID, user.ID, user.Role); err == nil {
			profilePhotoURL = url
		}
	}

	return presenter.ToUserResponse(user, profilePhotoURL)
}

// Logout godoc
// @Summary Logout
// @Description Revokes a refresh token.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body RefreshRequest true "Logout payload"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/auth/logout [post]
func (h AuthHandler) Logout(c *gin.Context) {
	var request RefreshRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.authService.Logout(c.Request.Context(), appauth.LogoutInput{RefreshToken: request.RefreshToken}); err != nil {
		h.handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

func (h AuthHandler) handleError(c *gin.Context, err error) {
	HandleError(c, err)
}
