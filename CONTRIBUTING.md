# Contributing

Thank you for your interest in contributing to this Go + Vue boilerplate! 🎉

## How to Contribute

### Reporting Bugs

1. Check that the bug hasn't already been reported in [issues](https://github.com/asaje379/boilerplate-go-vue/issues)
2. Open a new issue with:
   - A clear and descriptive title
   - A detailed description of the problem
   - Steps to reproduce the bug
   - Your environment (OS, Node/Go versions, etc.)
   - Screenshots if applicable

### Proposing Features

1. Open an issue with the `enhancement` label
2. Describe the desired feature and its use case
3. Discuss implementation with maintainers before starting

### Submitting a Pull Request

1. **Fork** the repository
2. **Clone** your fork locally
3. Create a branch for your feature:
   ```bash
   git checkout -b feature/my-new-feature
   # or
   git checkout -b fix/bug-fix
   ```
4. Make your changes following the [project conventions](./AGENTS.md)
5. **Test** your changes:
   - Go API: `cd api && go test ./...`
   - Admin Vue: `cd admin && npm run test`
   - CLI: `cd cli && npm test`
6. **Commit** with a conventional message (see below)
7. **Push** to your fork
8. Open a **Pull Request** to the `main` branch

### Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `style:` — Formatting (no code change)
- `refactor:` — Code refactoring
- `test:` — Tests
- `chore:` — Maintenance, dependencies

Example:

```
feat(api): add user search endpoint

- Add search service
- Cursor-based pagination
- Integration tests
```

### Project Structure

```
boilerplate-go-vue/
├── api/                # Go HTTP API (clean architecture)
├── admin/              # Vue 3 + Vite admin frontend
├── realtime-gateway/   # Go realtime transport (SSE + WebSocket)
├── pwa/                # Progressive Web App
├── landing/            # Static landing page
├── cli/                # Scaffolding CLI
└── docs/               # Documentation
```

### Code Guidelines

**Backend (Go)**

- Follow clean architecture (domain → application → interfaces)
- Keep handlers thin, business logic in services
- Mandatory unit tests for domain
- Name interfaces with `-er` suffix (e.g., `Reader`, `Writer`)

**Frontend (Vue/TypeScript)**

- Use Composition API
- Views use API modules (`services/api/*.api.ts`)
- No raw `fetch` in components
- Strict types with TypeScript

**Cross-stack**

- Preserve API contracts `{ data, meta? }` / `{ error, code, details? }`
- Maintain JWT (HS256) and RabbitMQ compatibility

### Code Review

All PRs are reviewed by at least one maintainer before merging. Checklist:

- [ ] Code follows project conventions
- [ ] Tests pass
- [ ] Documentation is up to date
- [ ] No regression identified
- [ ] Commit messages are clear

## Local Development

### Prerequisites

- Node.js ≥ 20.19.0
- Go ≥ 1.22
- Docker & Docker Compose
- Make

### Running the Project

```bash
# Via CLI
npm create asaje-go-vue@latest my-project
cd my-project
asaje start

# Or manually
docker-compose up -d
make dev
```

## Questions?

Feel free to open an issue for any questions. We're here to help! 🙌

---

Thank you for helping this boilerplate grow! ❤️
