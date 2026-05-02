package user

import (
	"context"
	"testing"
	"time"

	appcommon "api/internal/application/common"
	authdomain "api/internal/domain/auth"
	filedomain "api/internal/domain/file"
	userdomain "api/internal/domain/user"
	platformemail "api/internal/platform/email"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// Mock implementations
type mockUserRepository struct {
	users         map[string]*userdomain.User
	createErr     error
	getByIDErr    error
	getByEmailErr error
	countAdmins   int64
	listResult    []userdomain.User
	listTotal     int64
	updateErr     error
	updatePwdErr  error
}

type mockRefreshTokenRepository struct{}

func (m *mockUserRepository) Create(ctx context.Context, user *userdomain.User) error {
	if m.createErr != nil {
		return m.createErr
	}
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepository) CreateFirstAdminIfNone(ctx context.Context, user *userdomain.User) (bool, error) {
	for _, existing := range m.users {
		if existing.Role == userdomain.RoleAdmin {
			return false, nil
		}
	}
	if err := m.Create(ctx, user); err != nil {
		return false, err
	}
	return true, nil
}

func (m *mockRefreshTokenRepository) Create(ctx context.Context, token *authdomain.RefreshToken) error {
	return nil
}

func (m *mockRefreshTokenRepository) GetByID(ctx context.Context, id string) (*authdomain.RefreshToken, error) {
	return nil, appcommon.ErrNotFound
}

func (m *mockRefreshTokenRepository) RevokeByID(ctx context.Context, id string) error {
	return nil
}

func (m *mockRefreshTokenRepository) RevokeByUserID(ctx context.Context, userID string) error {
	return nil
}

func (m *mockUserRepository) GetByID(ctx context.Context, id string) (*userdomain.User, error) {
	if m.getByIDErr != nil {
		return nil, m.getByIDErr
	}
	if u, ok := m.users[id]; ok {
		return u, nil
	}
	return nil, appcommon.ErrNotFound
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*userdomain.User, error) {
	if m.getByEmailErr != nil {
		return nil, m.getByEmailErr
	}
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, appcommon.ErrNotFound
}

func (m *mockUserRepository) CountAdmins(ctx context.Context) (int64, error) {
	return m.countAdmins, nil
}

func (m *mockUserRepository) List(ctx context.Context, params appcommon.ListParams) ([]userdomain.User, int64, error) {
	return m.listResult, m.listTotal, nil
}

func (m *mockUserRepository) Count(ctx context.Context) (int64, error) {
	return int64(len(m.users)), nil
}

func (m *mockUserRepository) Update(ctx context.Context, user *userdomain.User) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepository) UpdatePassword(ctx context.Context, id string, passwordHash string) error {
	if m.updatePwdErr != nil {
		return m.updatePwdErr
	}
	if u, ok := m.users[id]; ok {
		u.PasswordHash = passwordHash
	}
	return nil
}

func (m *mockUserRepository) UpdateProfilePhoto(ctx context.Context, id string, profilePhotoFileID *string) error {
	if u, ok := m.users[id]; ok {
		u.ProfilePhotoFileID = profilePhotoFileID
	}
	return nil
}

func (m *mockUserRepository) UpdateIsActive(ctx context.Context, id string, isActive bool) error {
	if u, ok := m.users[id]; ok {
		u.IsActive = isActive
	}
	return nil
}

func (m *mockUserRepository) UpdateTwoFactorEnabled(ctx context.Context, id string, enabled bool) error {
	if u, ok := m.users[id]; ok {
		u.TwoFactorEnabled = enabled
	}
	return nil
}

func (m *mockUserRepository) ListIDsByRole(ctx context.Context, role userdomain.Role) ([]string, error) {
	var ids []string
	for _, u := range m.users {
		if u.Role == role {
			ids = append(ids, u.ID)
		}
	}
	return ids, nil
}

type mockFileRepository struct {
	files map[string]*filedomain.File
}

func (m *mockFileRepository) Create(ctx context.Context, file *filedomain.File) error {
	m.files[file.ID] = file
	return nil
}

func (m *mockFileRepository) GetByID(ctx context.Context, id string) (*filedomain.File, error) {
	return m.files[id], nil
}

func (m *mockFileRepository) List(ctx context.Context, params appcommon.ListParams, uploadedByID string, isAdmin bool) ([]filedomain.File, int64, error) {
	return nil, 0, nil
}

func (m *mockFileRepository) DeleteByID(ctx context.Context, id string) error {
	delete(m.files, id)
	return nil
}

type mockEventPublisher struct {
	events []appcommon.RealtimeEvent
}

func (m *mockEventPublisher) Publish(ctx context.Context, event appcommon.RealtimeEvent) error {
	m.events = append(m.events, event)
	return nil
}

func createTestValidator() platformemail.Validator {
	// Create a validator that allows all emails for testing
	v, _ := platformemail.NewValidator([]string{}, []string{})
	return v
}

// Helper functions
func createTestUser(id, email, name string, role userdomain.Role) *userdomain.User {
	return &userdomain.User{
		ID:              id,
		Email:           email,
		Name:            name,
		Role:            role,
		PreferredLocale: userdomain.LocaleFR,
		IsActive:        true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
}

func TestService_GetByID(t *testing.T) {
	tests := []struct {
		name      string
		userID    string
		setupMock func(*mockUserRepository)
		wantErr   error
		wantUser  *userdomain.User
	}{
		{
			name:   "returns user when found",
			userID: "user-123",
			setupMock: func(m *mockUserRepository) {
				m.users["user-123"] = createTestUser("user-123", "test@example.com", "Test User", userdomain.RoleUser)
			},
			wantErr:  nil,
			wantUser: createTestUser("user-123", "test@example.com", "Test User", userdomain.RoleUser),
		},
		{
			name:      "returns not found when user doesn't exist",
			userID:    "user-not-found",
			setupMock: func(m *mockUserRepository) {},
			wantErr:   appcommon.ErrNotFound,
			wantUser:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			mockUsers := &mockUserRepository{users: make(map[string]*userdomain.User)}
			tt.setupMock(mockUsers)

			service := NewService(mockUsers, &mockRefreshTokenRepository{}, &mockFileRepository{files: make(map[string]*filedomain.File)}, &mockEventPublisher{}, createTestValidator())

			// Act
			user, err := service.GetByID(context.Background(), tt.userID)

			// Assert
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantUser.ID, user.ID)
			assert.Equal(t, tt.wantUser.Email, user.Email)
		})
	}
}

func TestService_Create_Validation(t *testing.T) {
	tests := []struct {
		name    string
		input   CreateInput
		wantErr error
	}{
		{
			name: "fails when email is empty",
			input: CreateInput{
				ActorRole:       userdomain.RoleAdmin,
				Email:           "",
				Name:            "Test User",
				Password:        "password123",
				PreferredLocale: userdomain.LocaleFR,
				Role:            userdomain.RoleUser,
			},
			wantErr: appcommon.ErrValidation,
		},
		{
			name: "fails when name is empty",
			input: CreateInput{
				ActorRole:       userdomain.RoleAdmin,
				Email:           "test@example.com",
				Name:            "",
				Password:        "password123",
				PreferredLocale: userdomain.LocaleFR,
				Role:            userdomain.RoleUser,
			},
			wantErr: appcommon.ErrValidation,
		},
		{
			name: "fails when password is too short",
			input: CreateInput{
				ActorRole:       userdomain.RoleAdmin,
				Email:           "test@example.com",
				Name:            "Test User",
				Password:        "short",
				PreferredLocale: userdomain.LocaleFR,
				Role:            userdomain.RoleUser,
			},
			wantErr: appcommon.ErrValidation,
		},
		{
			name: "fails when non-admin tries to create user",
			input: CreateInput{
				ActorRole:       userdomain.RoleUser,
				Email:           "test@example.com",
				Name:            "Test User",
				Password:        "password123",
				PreferredLocale: userdomain.LocaleFR,
				Role:            userdomain.RoleUser,
			},
			wantErr: appcommon.ErrForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			mockUsers := &mockUserRepository{users: make(map[string]*userdomain.User)}
			service := NewService(mockUsers, &mockRefreshTokenRepository{}, &mockFileRepository{files: make(map[string]*filedomain.File)}, &mockEventPublisher{}, createTestValidator())

			// Act
			_, err := service.Create(context.Background(), tt.input)

			// Assert
			assert.ErrorIs(t, err, tt.wantErr)
		})
	}
}

func TestService_Create_DuplicateEmail(t *testing.T) {
	// Arrange
	mockUsers := &mockUserRepository{users: make(map[string]*userdomain.User)}
	mockUsers.users["existing-user"] = createTestUser("existing-user", "test@example.com", "Existing User", userdomain.RoleUser)

	service := NewService(mockUsers, &mockRefreshTokenRepository{}, &mockFileRepository{files: make(map[string]*filedomain.File)}, &mockEventPublisher{}, createTestValidator())

	input := CreateInput{
		ActorRole:       userdomain.RoleAdmin,
		Email:           "test@example.com",
		Name:            "Test User",
		Password:        "password123",
		PreferredLocale: userdomain.LocaleFR,
		Role:            userdomain.RoleUser,
	}

	// Act
	_, err := service.Create(context.Background(), input)

	// Assert
	assert.ErrorIs(t, err, appcommon.ErrConflict)
}

func TestService_UpdateCurrentProfile(t *testing.T) {
	tests := []struct {
		name      string
		input     UpdateProfileInput
		setupMock func(*mockUserRepository)
		wantErr   error
	}{
		{
			name: "updates profile successfully",
			input: UpdateProfileInput{
				ActorID:         "user-123",
				Email:           "updated@example.com",
				Name:            "Updated Name",
				PreferredLocale: userdomain.LocaleEN,
			},
			setupMock: func(m *mockUserRepository) {
				m.users["user-123"] = createTestUser("user-123", "old@example.com", "Old Name", userdomain.RoleUser)
			},
			wantErr: nil,
		},
		{
			name: "fails when user not found",
			input: UpdateProfileInput{
				ActorID:         "user-not-found",
				Email:           "updated@example.com",
				Name:            "Updated Name",
				PreferredLocale: userdomain.LocaleEN,
			},
			setupMock: func(m *mockUserRepository) {},
			wantErr:   appcommon.ErrNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			mockUsers := &mockUserRepository{users: make(map[string]*userdomain.User)}
			tt.setupMock(mockUsers)

			service := NewService(mockUsers, &mockRefreshTokenRepository{}, &mockFileRepository{files: make(map[string]*filedomain.File)}, &mockEventPublisher{}, createTestValidator())

			// Act
			user, err := service.UpdateCurrentProfile(context.Background(), tt.input)

			// Assert
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.input.Email, user.Email)
			assert.Equal(t, tt.input.Name, user.Name)
		})
	}
}

func TestService_ChangePassword(t *testing.T) {
	tests := []struct {
		name      string
		input     ChangePasswordInput
		setupMock func(*mockUserRepository)
		wantErr   error
	}{
		{
			name: "changes password successfully",
			input: ChangePasswordInput{
				ActorID:         "user-123",
				CurrentPassword: "oldpassword",
				NewPassword:     "newpassword123",
			},
			setupMock: func(m *mockUserRepository) {
				u := createTestUser("user-123", "test@example.com", "Test User", userdomain.RoleUser)
				// Generate real bcrypt hash for "oldpassword"
				hash, _ := bcrypt.GenerateFromPassword([]byte("oldpassword"), bcrypt.MinCost)
				u.PasswordHash = string(hash)
				m.users["user-123"] = u
			},
			wantErr: nil,
		},
		{
			name: "fails when user not found",
			input: ChangePasswordInput{
				ActorID:         "user-not-found",
				CurrentPassword: "oldpassword",
				NewPassword:     "newpassword123",
			},
			setupMock: func(m *mockUserRepository) {},
			wantErr:   appcommon.ErrNotFound,
		},
		{
			name: "fails when new password is too short",
			input: ChangePasswordInput{
				ActorID:         "user-123",
				CurrentPassword: "oldpassword",
				NewPassword:     "short",
			},
			setupMock: func(m *mockUserRepository) {
				m.users["user-123"] = createTestUser("user-123", "test@example.com", "Test User", userdomain.RoleUser)
			},
			wantErr: appcommon.ErrValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			mockUsers := &mockUserRepository{users: make(map[string]*userdomain.User)}
			tt.setupMock(mockUsers)

			service := NewService(mockUsers, &mockRefreshTokenRepository{}, &mockFileRepository{files: make(map[string]*filedomain.File)}, &mockEventPublisher{}, createTestValidator())

			// Act
			err := service.ChangePassword(context.Background(), tt.input)

			// Assert
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
		})
	}
}
