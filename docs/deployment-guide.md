# Deployment Guide

Guide de déploiement pour Railway (via CLI), Docker et environnements auto-hébergés.

> **Méthode recommandée :** Utiliser la CLI `asaje` qui automatise le provisionnement Railway, la configuration des variables, et le déploiement.
>
> Voir aussi : [CLI Reference](./cli-reference.md)

---

## 1. Railway via CLI asaje (Recommandé)

### 1.1 Prérequis

- Compte [Railway](https://railway.app)
- CLI Railway installé et authentifié :

```bash
npm install -g @railway/cli
railway login
railway --version  # 3.x+
```

### 1.2 Premier déploiement (setup)

Dans le dossier de ton projet (déjà créé avec `asaje create` ou manuellement) :

```bash
# Lier le projet à Railway
cd mon-projet
railway link

# Provisionner tout (infrastructure + services + déploiement)
npx create-asaje-go-vue@latest asaje setup-railway . --yes
```

**Ce que fait `setup-railway` :**

1. Provisionne PostgreSQL, RabbitMQ, Object Storage
2. Crée les services Railway : `api`, `worker`, `realtime-gateway`, `admin`, `landing`, `pwa`
3. Génère les secrets (JWT_SECRET, etc.)
4. Configure les variables d'environnement
5. Déploie chaque service
6. Écrit `asaje.railway.json` avec les IDs

### 1.3 Configuration via asaje.config.json

Personnalise `asaje.config.json` à la racine du projet :

```json
{
	"projectName": "Mon App",
	"projectSlug": "mon-app",
	"railway": {
		"variablesMode": "preserve-remote",
		"services": [
			{ "key": "api", "directory": "api", "dockerfile": "api/Dockerfile" },
			{ "key": "worker", "directory": "api", "dockerfile": "api/Dockerfile" },
			{
				"key": "realtime",
				"directory": "realtime-gateway",
				"dockerfile": "realtime-gateway/Dockerfile"
			},
			{
				"key": "admin",
				"directory": "admin",
				"dockerfile": "admin/Dockerfile"
			},
			{
				"key": "landing",
				"directory": "landing",
				"dockerfile": "landing/Dockerfile"
			},
			{ "key": "pwa", "directory": "pwa", "dockerfile": "pwa/Dockerfile" }
		],
		"variables": {
			"shared": { "LOG_LEVEL": "info" },
			"services": {
				"api": { "APP_ENV": "production" },
				"admin": { "VITE_APP_NAME": "Mon App" }
			}
		},
		"environments": {
			"production": {
				"railwayEnvironment": "production",
				"variables": {
					"services": {
						"admin": {
							"VITE_API_BASE_URL": "https://${{ api.RAILWAY_PUBLIC_DOMAIN }}/api/v1"
						}
					}
				}
			}
		}
	}
}
```

### 1.4 Déploiement continu

```bash
# Déployer tous les services après des changements
npx create-asaje-go-vue@latest asaje deploy-railway . --yes

# Déployer un service spécifique
npx create-asaje-go-vue@latest asaje deploy-railway . --service api

# Déployer plusieurs services
npx create-asaje-go-vue@latest asaje deploy-railway . --services api,admin
```

### 1.5 Mise à jour de la configuration

Après modification de `asaje.config.json` :

```bash
# Reconcilier Railway avec la nouvelle config
npx create-asaje-go-vue@latest asaje update-railway . --yes
```

### 1.6 Synchronisation des variables

```bash
# Appliquer les variables configurées
npx create-asaje-go-vue@latest asaje sync-railway-env . --yes

# Voir les différences avant application
npx create-asaje-go-vue@latest asaje sync-railway-env . --diff --dry-run
```

### 1.7 Inspection et snapshots

```bash
# Afficher la config résolue
npx create-asaje-go-vue@latest asaje print-railway-config . --json

# Exporter un snapshot
npx create-asaje-go-vue@latest asaje export-railway-config . --output ./railway.prod.json

# Comparer environnements
npx create-asaje-go-vue@latest asaje diff-railway-config . --environment production --compare-environment staging
```

---

## 2. Railway manuel (Sans CLI)

Si tu préfères ne pas utiliser la CLI pour Railway :

### 2.1 Structure des services

```
Services Railway :
├── PostgreSQL (addon Railway)
├── RabbitMQ (addon Railway)
├── Object Storage (addon Railway)
├── API (déploiement auto)
├── Worker (déploiement auto)
├── Realtime Gateway (déploiement auto)
├── Admin (déploiement auto)
├── Landing (optionnel)
└── PWA (optionnel)
```

### 2.2 Configuration des services

**API Service** (`api/railway.json`) :

```json
{
	"$schema": "https://railway.app/railway.schema.json",
	"build": {
		"builder": "DOCKERFILE",
		"dockerfilePath": "Dockerfile"
	},
	"deploy": {
		"startCommand": "./api serve",
		"healthcheckPath": "/api/v1/health",
		"healthcheckTimeout": 100,
		"restartPolicyType": "ON_FAILURE",
		"restartPolicyMaxRetries": 10
	}
}
```

**Worker Service** (même repo, commande différente) :

```json
{
	"deploy": {
		"startCommand": "./api worker",
		"healthcheckPath": "/api/v1/health"
	}
}
```

### 1.4 Déploiement

```bash
# Lier le projet local
railway link

# Déployer
railway up

# Voir les logs
railway logs

# Variables d'environnement
railway variables
```

### 1.5 Domaines personnalisés

```bash
# Dashboard Railway → API Service → Settings → Domains
# Ajouter : api.votredomaine.com

# Admin Service → Domains
# Ajouter : admin.votredomaine.com
```

---

## 2. Docker Compose (Self-hosted)

### 2.1 Structure complète

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: boilerplate
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:4.1-management
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    environment:
      PORT: 8080
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@postgres:5432/boilerplate?sslmode=disable
      JWT_SECRET: ${JWT_SECRET}
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_started
    ports:
      - "8080:8080"

  worker:
    build:
      context: ./api
      dockerfile: Dockerfile
    environment:
      API_COMMAND: worker
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@postgres:5432/boilerplate?sslmode=disable
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/
    depends_on:
      - postgres
      - rabbitmq

  realtime:
    build:
      context: ./realtime-gateway
      dockerfile: Dockerfile
    environment:
      PORT: 8081
      JWT_SECRET: ${JWT_SECRET}
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672/
    ports:
      - "8081:8081"

  admin:
    build:
      context: ./admin
      dockerfile: Dockerfile
    environment:
      VITE_API_BASE_URL: http://api:8080
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  postgres-data:
  rabbitmq-data:
  minio-data:
```

### 2.2 Déploiement

```bash
# 1. Créer le fichier .env.prod
DB_PASSWORD=<secure-password>
JWT_SECRET=<256-bit-secret>
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=<secure-password>
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<secure-password>

# 2. Lancer
docker-compose -f docker-compose.prod.yml up -d

# 3. Migrations
docker-compose -f docker-compose.prod.yml exec api ./api migrate

# 4. Seeds (premier déploiement uniquement)
docker-compose -f docker-compose.prod.yml exec api ./api seed
```

---

## 3. AWS (Alternative)

### 3.1 Services utilisés

| Service        | Usage                   |
| -------------- | ----------------------- |
| ECS / EKS      | API + Worker + Realtime |
| RDS PostgreSQL | Base de données         |
| Amazon MQ      | RabbitMQ managé         |
| S3             | Stockage fichiers       |
| CloudFront     | CDN Admin               |
| Route 53       | DNS                     |

### 3.2 Configuration S3

```bash
# Bucket policies pour fichiers publics
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::votre-bucket/public/*"
    }
  ]
}
```

---

## 4. Sécurité production

### 4.1 Variables obligatoires

| Variable           | Génération                | Où             |
| ------------------ | ------------------------- | -------------- |
| `JWT_SECRET`       | `openssl rand -base64 32` | API + Realtime |
| `ADMIN_PASSWORD`   | Fort, unique              | Seeds (1x)     |
| `DB_PASSWORD`      | Fort                      | PostgreSQL     |
| `SWAGGER_PASSWORD` | Fort                      | API (doc)      |

### 4.2 Headers sécurité (API)

```go
// Déjà configuré dans le middleware CORS
Access-Control-Allow-Origin: <whitelist>
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

### 4.3 SSL/TLS

- Railway : Auto-géré (Let's Encrypt)
- Docker : Utiliser Traefik ou Nginx avec certbot
- AWS : Certificate Manager + ALB

---

## 5. Healthchecks & Monitoring

### 5.1 Endpoints

| Service  | Endpoint             | Attendu                              |
| -------- | -------------------- | ------------------------------------ |
| API      | `GET /api/v1/health` | `{"status":"ok"}`                    |
| Worker   | `GET /api/v1/health` | `{"status":"ok","service":"worker"}` |
| Realtime | `GET /health`        | `{"status":"ok"}`                    |

### 5.2 Healthcheck Railway

```json
{
	"healthcheckPath": "/api/v1/health",
	"healthcheckTimeout": 100
}
```

### 5.3 Docker Healthcheck

```dockerfile
# Dockerfile API
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1
```

---

## 6. Migrations & Updates

### 6.1 Zero-downtime updates

```bash
# 1. Nouvelle version déployée en parallèle
# 2. Healthcheck OK
# 3. Traffic switch
# 4. Ancienne version arrêtée

# Railway : automatique
# Docker : blue/green avec Traefik ou 2 replicas minimum
```

### 6.2 Migrations en production

```bash
# Option 1 : Job de migration séparé (recommandé)
docker-compose -f docker-compose.prod.yml run --rm api ./api migrate

# Option 2 : Dans le conteneur (avec locking)
# Déjà géré par le bootstrap de l'API
```

---

## 7. Backup & Recovery

### 7.1 PostgreSQL

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20250101.sql
```

### 7.2 Fichiers (MinIO/S3)

```bash
# Mirror vers bucket de backup
mc mirror local/boilerplate-files backup/boilerplate-files-backup
```

---

## 8. Scaling

### 8.1 Horizontal (Railway)

```bash
# Dashboard → Service → Settings → Replicas
API : 2-3 replicas
Worker : 1-2 replicas (selon charge)
Realtime : 2+ replicas (stateless)
```

### 8.2 Vertical

| Service  | CPU   | RAM       | Condition           |
| -------- | ----- | --------- | ------------------- |
| API      | 0.5-1 | 512MB-1GB | Base                |
| Worker   | 0.5   | 512MB     | Si beaucoup de jobs |
| Realtime | 0.5   | 256MB     | Connexions SSE/WS   |

---

## 9. Troubleshooting déploiement

### Logs

```bash
# Railway
railway logs -s api

# Docker
docker-compose logs -f api
```

### Problèmes courants

| Symptôme                  | Cause                | Solution                        |
| ------------------------- | -------------------- | ------------------------------- |
| "migration pending"       | Schema pas à jour    | `go run . migrate`              |
| "connection refused" à DB | Network/DNS          | Vérifier DATABASE_URL           |
| 401 sur toutes les routes | JWT_SECRET différent | Sync API ↔ Realtime             |
| Fichiers 404              | MinIO/S3 config      | Vérifier endpoint + credentials |
| Worker ne consomme pas    | Queue différente     | Vérifier RABBITMQ_WORKER_QUEUE  |

---

## 10. Checklist avant mise en prod

- [ ] JWT_SECRET identique sur API et Realtime
- [ ] Variables d'environnement définies dans Railway/Docker
- [ ] Healthchecks configurés
- [ ] SSL/TLS activé
- [ ] Swagger protégé (basic auth)
- [ ] Rate limiting activé
- [ ] Logs agrégés (si possible)
- [ ] Backup automatisé configuré
- [ ] Documentation API à jour (Swagger)
- [ ] Seeds exécutés (admin initial créé)
