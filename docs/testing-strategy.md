# Testing Strategy

End-to-end testing guidelines for the Boilerplate Go Vue stack.

---

## 1. Testing Pyramid

```
       /\
      /  \     E2E (Playwright)
     /----\    ~10% of tests
    /      \
   /--------\  Integration
  /          \  ~20% of tests
 /------------\
/              \
/--------------\
   Unit Tests    ~70% of tests
```

---

## 2. Backend Testing (Go)

### 2.1 Test Structure

```
api/internal/
├── application/
│   ├── user/
│   │   ├── user_service.go
│   │   └── user_service_test.go    # Unit tests
│   └── auth/
│       ├── auth_service.go
│       └── auth_service_test.go
└── interfaces/http/
    └── handlers/
        ├── user_handler.go
        └── user_handler_test.go      # Handler tests
```

### 2.2 Unit Test Pattern

```go
func TestUserService_GetByID(t *testing.T) {
    // Arrange
    mockRepo := &mockUserRepository{}
    service := NewUserService(mockRepo)
    
    // Act
    user, err := service.GetByID(context.Background(), "user-123")
    
    // Assert
    require.NoError(t, err)
    assert.Equal(t, "user-123", user.ID)
}
```

### 2.3 Repository Mocking

```go
type mockUserRepository struct {
    users map[string]*user.User
    err   error
}

func (m *mockUserRepository) GetByID(ctx context.Context, id string) (*user.User, error) {
    if m.err != nil {
        return nil, m.err
    }
    return m.users[id], nil
}
```

### 2.4 Handler Tests

Test HTTP layer in isolation:
```go
func TestUserHandler_GetMe(t *testing.T) {
    // Setup
    router := gin.New()
    handler := NewUserHandler(mockService)
    router.GET("/api/v1/users/me", middleware.Auth(), handler.GetMe)
    
    // Execute
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/api/v1/users/me", nil)
    req.Header.Set("Authorization", "Bearer "+testToken)
    router.ServeHTTP(w, req)
    
    // Assert
    assert.Equal(t, http.StatusOK, w.Code)
}
```

### 2.5 Running Tests

```bash
# All tests
cd api && go test ./...

# With coverage
go test ./... -cover -coverprofile=coverage.out

# Specific package
go test ./internal/application/user/...

# Verbose
go test ./... -v
```

### 2.6 Coverage Targets

| Package | Target |
|---------|--------|
| `application/*` | 80%+ |
| `domain/*` | 70%+ |
| `interfaces/http/handlers` | 60%+ |

---

## 3. Frontend Testing (Vue)

### 3.1 Unit Tests (Vitest)

Test utilities, composables, services:

```typescript
// services/api/__tests__/auth.api.test.ts
import { describe, it, expect, vi } from 'vitest'
import { login } from '../auth.api'
import { client } from '../../http/client'

vi.mock('../../http/client')

describe('login', () => {
  it('returns tokens on success', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { accessToken: 'token', refreshToken: 'refresh' }
    })
    
    const result = await login({ email: 'test@example.com', password: 'pass' })
    
    expect(result.accessToken).toBe('token')
  })
})
```

### 3.2 Component Tests

Test component behavior, not implementation:

```typescript
// components/ui/__tests__/Button.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Button } from '../button'

describe('Button', () => {
  it('emits click event', async () => {
    const wrapper = mount(Button, {
      props: { label: 'Click me' }
    })
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted()).toHaveProperty('click')
  })
})
```

### 3.3 Store Tests

```typescript
// stores/__tests__/session.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from '../session'
import * as authApi from '@/services/api/auth.api'

vi.mock('@/services/api/auth.api')

describe('session store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('sets user after login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh'
    })
    
    const store = useSessionStore()
    await store.login({ email: 'test@test.com', password: 'pass' })
    
    expect(store.isAuthenticated).toBe(true)
  })
})
```

### 3.4 Running Tests

```bash
cd admin

# Unit tests
pnpm test:unit

# Watch mode
pnpm vitest --watch

# Coverage
pnpm vitest run --coverage
```

---

## 4. E2E Testing (Playwright)

### 4.1 Test Structure

```
admin/e2e/
├── auth.spec.ts          # Authentication flows
├── users.spec.ts         # User management
├── files.spec.ts         # File upload/download
└── fixtures/
    └── test-data.ts
```

### 4.2 Critical User Flows

| Flow | Priority | Test File |
|------|----------|-----------|
| Login with OTP | High | `auth.spec.ts` |
| Password reset | High | `auth.spec.ts` |
| View/edit profile | High | `profile.spec.ts` |
| User list CRUD | Medium | `users.spec.ts` |
| File upload | Medium | `files.spec.ts` |
| Notifications | Medium | `notifications.spec.ts` |
| Realtime connection | Medium | `realtime.spec.ts` |

### 4.3 E2E Test Pattern

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('authentication', () => {
  test('user can login with OTP', async ({ page }) => {
    // Navigate to login
    await page.goto('/login')
    
    // Fill credentials
    await page.fill('[name="email"]', 'admin@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // Expect OTP page
    await expect(page).toHaveURL(/\/verify-otp/)
    
    // Enter OTP (use test OTP in dev mode)
    await page.fill('[name="otp"]', '123456')
    await page.click('button[type="submit"]')
    
    // Redirected to home
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })
})
```

### 4.4 Test Data & Fixtures

```typescript
// e2e/fixtures/test-data.ts
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123'
  },
  regular: {
    email: 'user@example.com',
    password: 'user123'
  }
}

// e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@example.com')
    await page.fill('[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.fill('[name="otp"]', '123456')
    await page.click('button[type="submit"]')
    await use(page)
  }
})
```

### 4.5 Running E2E Tests

```bash
cd admin

# Build first (required for CI)
pnpm build

# Run all E2E tests
pnpm test:e2e

# Run specific test
pnpm test:e2e auth.spec.ts

# Debug mode
pnpm test:e2e --debug

# UI mode
pnpm test:e2e --ui
```

### 4.6 CI Configuration

```yaml
# .github/workflows/test.yml
- name: Run E2E tests
  run: |
    cd admin
    pnpm build
    pnpm test:e2e
  env:
    API_URL: http://localhost:8080
```

---

## 5. Test Data Management

### 5.1 Test Database

- Separate test database: `boilerplate_test`
- Migrations run before test suite
- Transactions rollback after each test

### 5.2 Seeding

```go
// test/helpers/seed.go
func SeedTestUser(t *testing.T, db *gorm.DB) *user.User {
    u := &user.User{
        ID:    "test-user-" + uuid.New().String(),
        Email: "test@example.com",
        Role:  user.RoleAdmin,
    }
    require.NoError(t, db.Create(u).Error)
    return u
}
```

---

## 6. Quality Gates

| Gate | Requirement |
|------|-------------|
| Pre-commit | `go test ./...` passes |
| PR | Coverage doesn't decrease |
| Release | All E2E tests pass |

---

## 7. Common Pitfalls

### Backend
- ❌ Testing implementation details (internal structs)
- ❌ Not mocking external services
- ❌ Tests depending on execution order

### Frontend
- ❌ Testing component internals (methods, data)
- ❌ Not waiting for async operations
- ❌ Hardcoded timeouts instead of `waitFor`

### E2E
- ❌ Tests depending on specific data state
- ❌ Not using unique test data (collisions)
- ❌ Testing UI implementation instead of user behavior
