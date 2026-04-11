package handlers

import (
	"net/http"

	appcommon "api/internal/application/common"
	appfile "api/internal/application/file"
	appuser "api/internal/application/user"
	userdomain "api/internal/domain/user"
	"api/internal/interfaces/http/middleware"
	"api/internal/interfaces/http/presenter"
	queryhelper "api/internal/interfaces/http/query"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userService appuser.Service
	fileService appfile.Service
}

type CreateUserRequest struct {
	Email              string `json:"email" binding:"required,email"`
	Name               string `json:"name" binding:"required"`
	Password           string `json:"password" binding:"required,min=8"`
	WhatsAppPhone      string `json:"whatsAppPhone"`
	MustChangePassword bool   `json:"mustChangePassword"`
	PreferredLocale    string `json:"preferredLocale" binding:"required"`
	Role               string `json:"role" binding:"required"`
}

type UpdateUserRequest struct {
	Email           string `json:"email" binding:"required,email"`
	Name            string `json:"name" binding:"required"`
	WhatsAppPhone   string `json:"whatsAppPhone"`
	PreferredLocale string `json:"preferredLocale" binding:"required"`
	Role            string `json:"role" binding:"required"`
}

type UpdateCurrentProfileRequest struct {
	Email           string `json:"email" binding:"required,email"`
	Name            string `json:"name" binding:"required"`
	WhatsAppPhone   string `json:"whatsAppPhone"`
	PreferredLocale string `json:"preferredLocale" binding:"required"`
}

type UpdateProfilePhotoRequest struct {
	FileID *string `json:"fileId"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=8"`
}

type UpdateSecurityRequest struct {
	TwoFactorEnabled bool `json:"twoFactorEnabled"`
}

type UpdateNotificationPrefsRequest struct {
	NotifyEmail    bool   `json:"notifyEmail"`
	NotifyInApp    bool   `json:"notifyInApp"`
	NotifyWhatsapp bool   `json:"notifyWhatsapp"`
	WhatsAppPhone  string `json:"whatsAppPhone"`
}

func NewUserHandler(userService appuser.Service, fileService appfile.Service) UserHandler {
	return UserHandler{userService: userService, fileService: fileService}
}

// Me godoc
// @Summary Current user
// @Description Returns the authenticated user profile.
// @Tags users
// @Produce json
// @Security BearerAuth
// @Success 200 {object} presenter.UserResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/users/me [get]
func (h UserHandler) Me(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	account, err := h.userService.GetByID(c.Request.Context(), current.ID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserResponse(c, account, current.ID, current.Role))
}

// UpdateCurrentProfile godoc
// @Summary Update current user profile
// @Description Updates the authenticated user profile fields.
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body UpdateCurrentProfileRequest true "Profile payload"
// @Success 200 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /api/v1/users/me [patch]
func (h UserHandler) UpdateCurrentProfile(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	var request UpdateCurrentProfileRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	updated, err := h.userService.UpdateCurrentProfile(c.Request.Context(), appuser.UpdateProfileInput{
		ActorID:         current.ID,
		Email:           request.Email,
		Name:            request.Name,
		WhatsAppPhone:   request.WhatsAppPhone,
		PreferredLocale: userdomain.Locale(request.PreferredLocale),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserResponse(c, updated, current.ID, current.Role))
}

// ChangePassword godoc
// @Summary Change current user password
// @Description Changes the authenticated user's password.
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body ChangePasswordRequest true "Change password payload"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/users/me/change-password [post]
func (h UserHandler) ChangePassword(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	var request ChangePasswordRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.userService.ChangePassword(c.Request.Context(), appuser.ChangePasswordInput{
		ActorID:         current.ID,
		CurrentPassword: request.CurrentPassword,
		NewPassword:     request.NewPassword,
	}); err != nil {
		h.handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// UpdateSecurity godoc
// @Summary Update current user security settings
// @Description Updates the authenticated user's security preferences.
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body UpdateSecurityRequest true "Security payload"
// @Success 200 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/users/me/security [patch]
func (h UserHandler) UpdateSecurity(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	var request UpdateSecurityRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	updated, err := h.userService.UpdateSecurity(c.Request.Context(), appuser.UpdateSecurityInput{
		ActorID:          current.ID,
		TwoFactorEnabled: request.TwoFactorEnabled,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserResponse(c, updated, current.ID, current.Role))
}

func (h UserHandler) UpdateNotificationPrefs(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	var request UpdateNotificationPrefsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	updated, err := h.userService.UpdateNotificationPrefs(c.Request.Context(), appuser.UpdateNotificationPrefsInput{
		ActorID:        current.ID,
		NotifyEmail:    request.NotifyEmail,
		NotifyInApp:    request.NotifyInApp,
		NotifyWhatsapp: request.NotifyWhatsapp,
		WhatsAppPhone:  request.WhatsAppPhone,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserResponse(c, updated, current.ID, current.Role))
}

// List godoc
// @Summary List users
// @Description Returns all users. Admin only.
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Param search query string false "Search on name, email, whatsapp phone, role"
// @Param sortBy query string false "Sort field" Enums(createdAt,updatedAt,name,email,whatsAppPhone,role)
// @Param sortOrder query string false "Sort order" Enums(asc,desc)
// @Success 200 {object} presenter.PaginatedUsersResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 400 {object} ErrorResponse
// @Router /api/v1/users [get]
func (h UserHandler) List(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	params, err := queryhelper.ParseListParams(c, "createdAt", map[string]struct{}{
		"createdAt":     {},
		"updatedAt":     {},
		"name":          {},
		"email":         {},
		"whatsAppPhone": {},
		"role":          {},
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	users, err := h.userService.List(c.Request.Context(), appuser.ListInput{ActorRole: current.Role, Params: params})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, presenter.ToPaginatedUsersResponseWithPhotos(users, h.profilePhotoURLs(c, users.Items, current.ID, current.Role)))
}

// Create godoc
// @Summary Create user
// @Description Creates a new user. Admin only.
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body CreateUserRequest true "Create user payload"
// @Success 201 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /api/v1/users [post]
func (h UserHandler) Create(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	var request CreateUserRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	created, err := h.userService.Create(c.Request.Context(), appuser.CreateInput{
		ActorRole:          current.Role,
		Email:              request.Email,
		Name:               request.Name,
		Password:           request.Password,
		WhatsAppPhone:      request.WhatsAppPhone,
		MustChangePassword: request.MustChangePassword,
		PreferredLocale:    userdomain.Locale(request.PreferredLocale),
		Role:               userdomain.Role(request.Role),
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, h.toUserResponse(c, created, current.ID, current.Role))
}

// GetByID godoc
// @Summary Get user by ID
// @Description Returns a single user by id. Admin only.
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/users/{id} [get]
func (h UserHandler) GetByID(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid user id"})
		return
	}

	account, err := h.userService.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserResponse(c, account, current.ID, current.Role))
}

// Update godoc
// @Summary Update user
// @Description Updates a user. Admin only.
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Param payload body UpdateUserRequest true "Update user payload"
// @Success 200 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /api/v1/users/{id} [patch]
func (h UserHandler) Update(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid user id"})
		return
	}

	var request UpdateUserRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	updated, err := h.userService.Update(c.Request.Context(), appuser.UpdateInput{
		ActorRole:       current.Role,
		Email:           request.Email,
		Name:            request.Name,
		WhatsAppPhone:   request.WhatsAppPhone,
		PreferredLocale: userdomain.Locale(request.PreferredLocale),
		Role:            userdomain.Role(request.Role),
		UserID:          userID,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserResponse(c, updated, current.ID, current.Role))
}

// Deactivate godoc
// @Summary Deactivate user
// @Description Deactivates a user. Admin only.
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/users/{id}/deactivate [patch]
func (h UserHandler) Deactivate(c *gin.Context) {
	h.updateActiveStatus(c, false)
}

// Reactivate godoc
// @Summary Reactivate user
// @Description Reactivates a user. Admin only.
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/users/{id}/reactivate [patch]
func (h UserHandler) Reactivate(c *gin.Context) {
	h.updateActiveStatus(c, true)
}

// UpdateProfilePhoto godoc
// @Summary Update current user profile photo
// @Description Assigns or clears the authenticated user's profile photo using an uploaded file id.
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param payload body UpdateProfilePhotoRequest true "Profile photo payload"
// @Success 200 {object} presenter.UserResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/users/me/profile-photo [patch]
func (h UserHandler) UpdateProfilePhoto(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	var request UpdateProfilePhotoRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	updated, err := h.userService.UpdateProfilePhoto(c.Request.Context(), current.ID, current.ID, current.Role, request.FileID)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserResponse(c, updated, current.ID, current.Role))
}

func (h UserHandler) handleError(c *gin.Context, err error) {
	HandleError(c, err)
}

func (h UserHandler) updateActiveStatus(c *gin.Context, isActive bool) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid user id"})
		return
	}

	updated, err := h.userService.UpdateActiveStatus(c.Request.Context(), current.Role, userID, isActive)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, h.toUserResponse(c, updated, current.ID, current.Role))
}

func (h UserHandler) toUserResponse(c *gin.Context, user *userdomain.User, actorID string, actorRole userdomain.Role) presenter.UserResponse {
	profilePhotoURL := ""
	if user.ProfilePhotoFileID != nil && *user.ProfilePhotoFileID != "" {
		if url, _, err := h.fileService.GetAccessibleDownloadURL(c.Request.Context(), *user.ProfilePhotoFileID, actorID, actorRole); err == nil {
			profilePhotoURL = url
		}
	}

	return presenter.ToUserResponse(user, profilePhotoURL)
}

func (h UserHandler) profilePhotoURLs(c *gin.Context, users []userdomain.User, actorID string, actorRole userdomain.Role) map[string]string {
	urls := make(map[string]string, len(users))
	for i := range users {
		if users[i].ProfilePhotoFileID == nil || *users[i].ProfilePhotoFileID == "" {
			continue
		}
		if url, _, err := h.fileService.GetAccessibleDownloadURL(c.Request.Context(), *users[i].ProfilePhotoFileID, actorID, actorRole); err == nil {
			urls[users[i].ID] = url
		}
	}

	return urls
}
