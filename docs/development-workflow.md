# Development Workflow

Guide de développement local pour le Boilerplate Go Vue.

> **Méthode recommandée :** Utiliser la CLI `asaje` qui automatise tout le workflow. Ce document présente d'abord la méthode CLI, puis les commandes manuelles pour comprendre ce qui se passe sous le capot.
>
> Voir aussi : [CLI Reference](./cli-reference.md)

---

## 1. Prérequis

### Outils requis

| Outil   | Version          | Usage                           |
| ------- | ---------------- | ------------------------------- |
| Go      | 1.25+            | API + Realtime Gateway          |
| Node.js | 20.19+ ou 22.12+ | Admin + PWA                     |
| pnpm    | 9+               | Package manager (monorepo)      |
| Docker  | 24+              | PostgreSQL + RabbitMQ + MinIO   |
| Make    | -                | Scripts utilitaires (optionnel) |

### Vérification

````bash
# Go
go version  # go version go1.25.0 darwin/arm64

# Node
node --version  # v20.19.0
pnpm --version  # 9.0.0

# Docker
docker --version  # Docker version 24.0.0
docker-compose --version  # Docker Compose version v2.20.0

### CLI asaje (recommandé)

```bash
# Utilisation via npx (pas d'installation requise)
npx create-asaje-go-vue@latest --help
````

---

## 2. Workflow avec la CLI (Recommandé)

### 2.1 Créer un projet

```bash
# Créer un projet interactif
npx create-asaje-go-vue@latest my-app

# Ou créer avec valeurs par défaut
npx create-asaje-go-vue@latest my-app --yes
```

La CLI va :

- Cloner le boilerplate
- Configurer les ports, locale, providers
- Générer les fichiers `.env`
- Installer les dépendances
- (Optionnel) Démarrer Docker

### 2.2 Démarrer le développement

```bash
cd my-app

# Démarrer tous les services
npx create-asaje-go-vue@latest asaje start . --yes

# Profils disponibles
npx create-asaje-go-vue@latest asaje start . --profile backend-only    # API + Worker + Realtime
npx create-asaje-go-vue@latest asaje start . --profile frontend-only   # Admin + Landing + PWA

# Exclusions
npx create-asaje-go-vue@latest asaje start . --skip-worker --skip-landing
```

La CLI démarre :

- Docker infrastructure (PostgreSQL, RabbitMQ, MinIO)
- API Server (`go run . serve`)
- API Worker (`go run . worker`)
- Realtime Gateway
- Admin (Vite)
- Landing / PWA (si configurés)

### 2.3 Vérifier le setup

```bash
npx create-asaje-go-vue@latest asaje doctor .
```

### 2.4 Logs

La CLI stream les logs de tous les services. Pour voir les logs individuellement :

```bash
# Dans un autre terminal
tail -f /tmp/asaje-*.log
```

---

## 3. Initialisation manuelle (Sans CLI)

### 2.1 Cloner et structurer

```bash
git clone <repo-url> boilerplate-go-vue
cd boilerplate-go-vue
```

### 2.2 Démarrer l'infrastructure

```bash
# Terminal 1 : Infrastructure
docker-compose up postgres rabbitmq minio

# Vérifier que tout est prêt :
# - PostgreSQL : localhost:5432
# - RabbitMQ Management : http://localhost:15672 (guest/guest)
# - MinIO Console : http://localhost:9001 (minioadmin/minioadmin)
```

### 2.3 Configurer l'API

```bash
cd api
cp .env.example .env

# Éditer .env avec les valeurs locales :
DATABASE_URL="postgres://postgres:postgres@localhost:5432/boilerplate_go_vue?sslmode=disable"
JWT_SECRET="dev-secret-key-min-32-characters-long"
RABBITMQ_URL="amqp://guest:guest@localhost:5672/"
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
```

### 2.4 Configurer l'Admin

```bash
cd admin
cp .env.example .env.development

# Valeurs par défaut :
VITE_API_BASE_URL=http://localhost:8080
VITE_REALTIME_BASE_URL=http://localhost:8081
```

---

## 3. Démarrage des services

### 3.1 API (Terminal 2)

```bash
cd api

# Migrations + Serveur HTTP
go run . serve

# Ou en mode worker (dans un autre terminal)
go run . worker

# L'API est disponible sur http://localhost:8080
# Swagger UI : http://localhost:8080/swagger/index.html
```

### 3.2 Realtime Gateway (Terminal 3)

```bash
cd realtime-gateway
cp .env.example .env

# Éditer .env :
PORT=8081
JWT_SECRET="dev-secret-key-min-32-characters-long"
RABBITMQ_URL="amqp://guest:guest@localhost:5672/"

go run .

# Disponible sur http://localhost:8081
```

### 3.3 Admin Frontend (Terminal 4)

```bash
cd admin
pnpm install
pnpm dev

# Disponible sur http://localhost:5173
```

### 3.4 PWA (optionnel, Terminal 5)

```bash
cd pwa
pnpm install
pnpm dev

# Disponible sur http://localhost:4174
```

---

## 4. Flux de développement quotidien

### 4.1 Démarrage rapide (déjà initialisé)

```bash
# Terminal 1 : Infrastructure (si pas déjà lancée)
docker-compose up postgres rabbitmq minio

# Terminal 2 : API
cd api && go run . serve

# Terminal 3 : Admin
cd admin && pnpm dev
```

### 4.2 Ajouter une feature

**Backend (API)** :

```bash
# 1. Modifier le domaine si nécessaire
# api/internal/domain/user/

# 2. Implémenter la logique métier
# api/internal/application/user/service.go

# 3. Exposer via HTTP handler
# api/internal/interfaces/http/handlers/user_handler.go

# 4. Ajouter la route
# api/internal/interfaces/http/router/router.go

# 5. Tests
# api/internal/application/user/service_test.go
cd api && go test ./internal/application/user/... -v

# 6. Regénérer Swagger si l'API change
cd api && go run . swagger
```

**Frontend (Admin)** :

```bash
# 1. Ajouter le module API
# admin/src/services/api/feature.api.ts

# 2. Mettre à jour le store si nécessaire
# admin/src/stores/feature.ts

# 3. Créer la vue
# admin/src/views/FeatureView.vue

# 4. Ajouter la route
# admin/src/router/index.ts

# 5. Tests unitaires
# admin/src/services/api/__tests__/feature.api.test.ts
cd admin && pnpm test:unit

# 6. Tests E2E
cd admin && pnpm build && pnpm test:e2e
```

### 4.3 Cycle de feedback rapide

| Action              | Commande                      | Temps |
| ------------------- | ----------------------------- | ----- |
| Test API unitaire   | `go test ./... -run TestName` | <1s   |
| Restart API         | `Ctrl+C` + `go run . serve`   | ~2s   |
| Test admin unitaire | `pnpm vitest --watch`         | <1s   |
| Lint admin          | `pnpm lint`                   | ~3s   |

---

## 5. Commandes utiles

### 5.1 API (Go)

```bash
cd api

# Serveur HTTP (avec migrations auto)
go run . serve

# Worker (tâches async)
go run . worker

# Migrations uniquement
go run . migrate

# Seeds (crée admin/user si configuré)
go run . seed

# Regénérer Swagger
go run . swagger

# Tests
go test ./...
go test ./internal/application/user/... -v
go test ./... -cover

# Build
mkdir -p bin && go build -o bin/api .

# Lancer le binaire
./bin/api serve
```

### 5.2 Admin (Vue)

```bash
cd admin

# Dev server
pnpm dev

# Build production
pnpm build

# Tests
pnpm test:unit
pnpm test:e2e

# Lint & Format
pnpm lint
pnpm format

# Type check
pnpm type-check
```

### 5.3 Docker

```bash
# Démarrer l'infrastructure
docker-compose up postgres rabbitmq minio

# Mode détaché
docker-compose up -d postgres rabbitmq minio

# Arrêter
docker-compose down

# Reset complet (supprime les volumes)
docker-compose down -v

# Logs
docker-compose logs -f postgres
```

---

## 6. Debugging

### 6.1 API

```bash
# Avec délai de compilation
go run -race . serve

# Profiling (ajouter dans le code)
import _ "net/http/pprof"
go func() { log.Println(http.ListenAndServe("localhost:6060", nil)) }()
```

### 6.2 Admin

```bash
# DevTools Vue
pnpm dev
# Ouvrir Vue DevTools dans Chrome

# Debug tests
pnpm test:unit -- --reporter=verbose

# Debug E2E
pnpm test:e2e --debug
```

---

## 7. Hooks Git (optionnel)

```bash
# .git/hooks/pre-commit
#!/bin/bash
cd api && go test ./... || exit 1
cd ../admin && pnpm lint && pnpm type-check || exit 1
```

---

## 8. Résolution de problèmes

### Problème : "pq: database does not exist"

```bash
# Créer la base manuellement
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE boilerplate_go_vue;"
```

### Problème : "connection refused" à RabbitMQ

```bash
# Attendre que RabbitMQ soit prêt
docker-compose logs -f rabbitmq
# Attendre "Server startup complete"
```

### Problème : Ports déjà utilisés

```bash
# Trouver le processus
lsof -i :8080
kill -9 <PID>

# Ou utiliser des ports différents
PORT=8082 go run . serve
```

### Problème : Cache npm/pnpm corrompu

```bash
cd admin
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 9. Conventions de commit

Format : `type(scope): description`

```bash
# Exemples
git commit -m "feat(api): add user search endpoint"
git commit -m "fix(admin): resolve profile photo upload"
git commit -m "docs: update development workflow"
git commit -m "test(api): add user service tests"
```

Types : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

---

## 10. Checklist avant PR

- [ ] Tests passent (`go test ./...`, `pnpm test:unit`)
- [ ] Lint propre (`pnpm lint`)
- [ ] Types corrects (`pnpm type-check`)
- [ ] Swagger regénéré si API modifiée
- [ ] Pas de secrets dans le code
- [ ] Documentation mise à jour si nécessaire
