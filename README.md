# Go + Vue Fullstack Boilerplate

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go)](https://golang.org)
[![Vue Version](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A production-ready fullstack boilerplate combining **Go** (backend API with clean architecture) and **Vue 3** (modern frontend). Built for scalability, type safety, and developer experience.

## ✨ Features

### Backend (`api/`)
- **Clean Architecture** — Domain-driven design with clear separation of concerns
- **JWT Authentication** — Secure token-based auth with refresh token flow
- **Swagger/OpenAPI** — Auto-generated API documentation
- **Database** — PostgreSQL with GORM ORM and migration support
- **Testing** — Unit and integration tests with high coverage
- **Real-time** — WebSocket & SSE support via RabbitMQ

### Admin Frontend (`admin/`)
- **Vue 3 + Vite** — Modern Composition API with lightning-fast HMR
- **TypeScript** — Full type safety throughout
- **Pinia** — State management with stores pattern
- **Playwright E2E** — End-to-end testing suite
- **Rich Components** — Data tables, forms, charts, and more

### Real-time Gateway (`realtime-gateway/`)
- **Dual Protocol** — Server-Sent Events (SSE) and WebSocket support
- **RabbitMQ Integration** — Message broker for scalable events
- **JWT Secured** — Authenticated connections only

### Progressive Web App (`pwa/`)
- **Service Worker** — Offline support and background sync
- **Push Notifications** — Web push API integration
- **Mobile-First** — Responsive design for all devices

### CLI Tool (`cli/`)
- **Scaffolding** — One-command project creation
- **Railway Integration** — Deploy to Railway with ease
- **Configuration Sync** — Keep environments in sync

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20.19.0
- **Go** ≥ 1.22
- **Docker** & Docker Compose
- **Make**

### 1. Create a New Project

```bash
npm create asaje-go-vue@latest my-project
cd my-project
```

### 2. Start Development

```bash
# Using the CLI (recommended)
asaje start

# Or manually with Docker Compose
docker-compose up -d
make dev
```

### 3. Access the Services

| Service | URL | Description |
|---------|-----|-------------|
| Admin | http://localhost:5173 | Vue 3 admin dashboard |
| API | http://localhost:8080 | Go HTTP API |
| API Docs | http://localhost:8080/swagger/index.html | Swagger UI |
| Realtime Gateway | http://localhost:3002 | SSE/WebSocket gateway |
| PWA | http://localhost:5174 | Progressive Web App |
| Landing | http://localhost:8081 | Static landing page |

## 📁 Project Structure

```
my-project/
├── api/                     # Go HTTP API
│   ├── internal/
│   │   ├── application/     # Business logic & use cases
│   │   ├── domain/          # Entities & interfaces
│   │   ├── infrastructure/  # DB, cache, external services
│   │   └── interfaces/      # HTTP handlers, middleware
│   ├── docs/                # Swagger documentation
│   └── tests/               # Integration tests
│
├── admin/                   # Vue 3 Admin Dashboard
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── views/           # Page components
│   │   ├── services/        # API clients
│   │   ├── stores/          # Pinia state management
│   │   └── composables/     # Vue composables
│   └── e2e/                 # Playwright tests
│
├── realtime-gateway/        # Go Real-time Transport
│   ├── internal/
│   │   ├── application/     # Event handlers
│   │   └── interfaces/      # SSE/WebSocket handlers
│   └── load-tests/          # Performance tests
│
├── pwa/                     # Progressive Web App
│   ├── src/
│   │   ├── components/      # PWA components
│   │   ├── lib/             # Utilities
│   │   └── services/        # Service worker logic
│   └── public/              # Static assets
│
├── landing/                 # Static Landing Page
│   ├── index.html
│   └── contact.html
│
├── cli/                     # Scaffolding CLI (in parent repo)
└── docker-compose.yml       # Local development stack
```

## 🏗️ Architecture

### Clean Architecture (Backend)

The API follows **Clean Architecture** principles:

```
┌─────────────────────────────────────┐
│         Interfaces (HTTP)           │  ← Controllers, Middleware
├─────────────────────────────────────┤
│        Application Layer            │  ← Use Cases, Services
├─────────────────────────────────────┤
│          Domain Layer               │  ← Entities, Interfaces
├─────────────────────────────────────┤
│       Infrastructure Layer          │  ← DB, Cache, External APIs
└─────────────────────────────────────┘
```

**Key Principles:**
- **Dependency Inversion** — Domain defines interfaces, infrastructure implements
- **Testability** — Business logic is pure and easily testable
- **Separation of Concerns** — Each layer has a single responsibility

### API Response Format

All API responses follow a consistent envelope:

**Success:**
```json
{
  "data": { ... },
  "meta": { "page": 1, "per_page": 20, "total": 100 }
}
```

**Error:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": { "field": "email", "message": "Invalid format" }
}
```

### Frontend Patterns

**API Integration:**
```typescript
// services/api/user.api.ts
import { http } from '@/services/http/client'

export const userApi = {
  list: (params?: ListParams) => 
    http.get<PaginatedResponse<User[]>>('/users', { params }),
  
  get: (id: string) => 
    http.get<User>(`/users/${id}`),
  
  create: (data: CreateUserInput) => 
    http.post<User>('/users', data),
  
  update: (id: string, data: UpdateUserInput) => 
    http.put<User>(`/users/${id}`, data),
  
  delete: (id: string) => 
    http.delete(`/users/${id}`),
}
```

**State Management with Pinia:**
```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  
  const fetchUsers = async () => {
    loading.value = true
    const { data } = await userApi.list()
    users.value = data.data
    loading.value = false
  }
  
  return { users, loading, fetchUsers }
})
```

## 🛠️ Development

### Backend Commands

```bash
cd api

# Run tests
go test ./...

# Run with hot reload (requires air)
air

# Generate swagger docs
swag init

# Build binary
go build -o api .
```

### Frontend Commands

```bash
cd admin

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Build for production
pnpm build
```

### Makefile Commands

```bash
# Start all services
docker-compose up -d

# Run database migrations
make migrate-up

# Seed database
make seed

# Run all tests
make test

# Build production images
make build

# Clean up
make clean
```

## 🔧 Configuration

### Environment Variables

Each service has its own `.env.example` file:

**API (`api/.env`):**
```env
APP_ENV=development
APP_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=boilerplate
DB_USER=postgres
DB_PASSWORD=secret
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

**Admin (`admin/.env`):**
```env
VITE_API_URL=http://localhost:8080
VITE_REALTIME_URL=http://localhost:3002
```

**Realtime Gateway (`realtime-gateway/.env`):**
```env
PORT=3002
RABBITMQ_URL=amqp://guest:guest@localhost:5672
JWT_SECRET=your-secret-key
```

## 🧪 Testing

### Backend Testing

```bash
cd api

# Unit tests
go test ./internal/...

# Integration tests
go test ./tests/...

# With coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Frontend Testing

```bash
cd admin

# Unit tests
pnpm test:unit

# E2E tests with Playwright
pnpm test:e2e

# Specific test file
pnpm test:e2e -- tests/login.spec.ts
```

### Load Testing

```bash
# Realtime gateway load tests
cd realtime-gateway/load-tests
npm install
npm run test:sse
npm run test:websocket
```

## 📦 Deployment

### Railway (Recommended)

```bash
# Setup Railway project
asaje setup-railway

# Deploy all services
asaje deploy-railway

# Sync environment variables
asaje sync-railway-env
```

### Manual Docker Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-Specific Configurations

- `admin/.env.development` — Local development
- `admin/.env.production` — Production build
- `api/.env` — API configuration
- `realtime-gateway/.env` — Realtime gateway config

## 🔐 Security

- **JWT Authentication** — HS256 algorithm with pinned secrets
- **Password Hashing** — bcrypt with max 72 bytes
- **CORS** — Configurable per environment
- **Rate Limiting** — Built-in middleware
- **SQL Injection Prevention** — Parameterized queries via GORM
- **XSS Protection** — Input sanitization

## 📚 Documentation

- [Project Conventions](./AGENTS.md) — Code style and patterns
- [Changelog](./CHANGELOG.md) — Version history
- [Contributing Guide](./CONTRIBUTING.md) — How to contribute
- [Fullstack Conventions](./docs/fullstack-foundation-conventions.md) — Architecture patterns
- [Testing Strategy](./docs/testing-strategy.md) — Testing guidelines

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

Quick contribution workflow:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`make test`)
5. Commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. Push to your fork
7. Open a Pull Request

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE) — see the LICENSE file for details.

```
Copyright 2025 Asaje

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/asaje379/boilerplate-go-vue/issues)
- **Discussions**: [GitHub Discussions](https://github.com/asaje379/boilerplate-go-vue/discussions)

---

Built with ❤️ by [Asaje](https://github.com/asaje379)
