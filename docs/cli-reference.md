# CLI Reference (asaje)

Documentation complète de la CLI `asaje` pour piloter le boilerplate Go Vue.

---

## Installation

### Utilisation sans installation (recommandé)

```bash
# Toutes les commandes via npx
npx create-asaje-go-vue@latest <command> [options]
```

### Installation globale (optionnel)

```bash
npm install -g create-asaje-go-vue@latest
asaje <command> [options]
```

---

## Commandes principales

### `create` - Créer un nouveau projet

```bash
# Créer un projet interactif
npx create-asaje-go-vue@latest my-app

# Créer avec options par défaut
npx create-asaje-go-vue@latest my-app --yes

# Créer avec template spécifique
npx create-asaje-go-vue@latest my-app --template asaje379/boilerplate-go-vue --branch main

# Créer sans installer les dépendances
npx create-asaje-go-vue@latest my-app --yes --skip-install

# Créer sans démarrer Docker
npx create-asaje-go-vue@latest my-app --yes --skip-infra
```

**Ce que fait `create` :**
- Clone le boilerplate depuis GitHub (degit)
- Supprime les fichiers template-only (`cli/`)
- Pose les questions de setup (ports, storage, mail, locale)
- Écrit `asaje.config.json`
- Génère les `.env` locaux pour chaque service
- Installe les dépendances (optionnel)
- Démarre Docker infrastructure (optionnel)

---

### `start` - Démarrer le développement local

```bash
# Démarrer tous les services
npx create-asaje-go-vue@latest asaje start ./my-app

# Démarrer avec confirmation auto
npx create-asaje-go-vue@latest asaje start ./my-app --yes

# Profils prédéfinis
npx create-asaje-go-vue@latest asaje start ./my-app --profile full          # Tout (défaut)
npx create-asaje-go-vue@latest asaje start ./my-app --profile backend-only  # API + Worker + Realtime
npx create-asaje-go-vue@latest asaje start ./my-app --profile frontend-only # Admin + Landing + PWA

# Exclusions spécifiques
npx create-asaje-go-vue@latest asaje start ./my-app --skip-admin --skip-worker
npx create-asaje-go-vue@latest asaje start ./my-app --skip-landing --skip-pwa
```

**Ce que fait `start` :**
- Valide la structure du projet
- Crée les `.env` manquants depuis `.env.example`
- Installe les dépendances si nécessaire
- Démarre Docker infrastructure (si pas déjà lancé)
- Démarre les services sélectionnés
- Stream les logs jusqu'à `Ctrl+C`

---

### `doctor` - Vérifier le setup

```bash
npx create-asaje-go-vue@latest asaje doctor ./my-app
```

**Vérifications :**
- Outils requis : `node`, `pnpm`, `go`, `docker`
- Structure du projet valide
- Fichiers `.env` ou `.env.example` présents

---

### `update` - Mettre à jour depuis le template

```bash
# Preview des changements
npx create-asaje-go-vue@latest asaje update ./my-app --dry-run

# Appliquer la mise à jour
npx create-asaje-go-vue@latest asaje update ./my-app --yes

# Inclure des fichiers spécifiques du template
npx create-asaje-go-vue@latest asaje update ./my-app --include admin/src/stores/session.ts,admin/src/services/http/session.ts --yes
```

**Fichiers mis à jour :**
- Railway config
- Dockerfiles
- Swagger docs générées
- `.env.example` files
- (Optionnel) Fichiers spécifiques avec `--include`

---

## Commandes Railway

### `setup-railway` - Provisionner Railway (premier déploiement)

```bash
# Setup complet interactif
npx create-asaje-go-vue@latest asaje setup-railway ./my-app

# Setup automatique
npx create-asaje-go-vue@latest asaje setup-railway ./my-app --yes

# Preview sans appliquer
npx create-asaje-go-vue@latest asaje setup-railway ./my-app --dry-run
```

**Ce que fait `setup-railway` :**
- Vérifie Railway CLI installé et authentifié
- Lit le contexte du projet Railway lié
- Provisionne PostgreSQL, RabbitMQ, Object Storage
- Crée les services Railway : `api`, `worker`, `realtime-gateway`, `admin`, `landing`, `pwa`
- Applique les variables d'environnement configurées
- Génère les secrets manquants (JWT_SECRET, etc.)
- Déclenche le premier déploiement
- Écrit `asaje.railway.json`

**Prérequis :**
```bash
# Installer Railway CLI
npm install -g @railway/cli

# Authentifier
railway login

# Lier le projet (dans le dossier du projet)
railway link
```

---

### `update-railway` - Mettre à jour Railway après config changes

```bash
# Reconcilier après modification de asaje.config.json
npx create-asaje-go-vue@latest asaje update-railway ./my-app --yes
```

**Usage :** À exécuter après avoir modifié :
- `railway.services` dans `asaje.config.json`
- `railway.variables`
- `railway.environments`

---

### `sync-railway-env` - Synchroniser les variables

```bash
# Appliquer les variables configurées
npx create-asaje-go-vue@latest asaje sync-railway-env ./my-app --yes

# Voir les différences avant application
npx create-asaje-go-vue@latest asaje sync-railway-env ./my-app --diff --dry-run

# Preview seul
npx create-asaje-go-vue@latest asaje sync-railway-env ./my-app --dry-run
```

---

### `deploy-railway` - Redéployer les services

```bash
# Redéployer tous les services
npx create-asaje-go-vue@latest asaje deploy-railway ./my-app

# Redéployer un service spécifique
npx create-asaje-go-vue@latest asaje deploy-railway ./my-app --service api
npx create-asaje-go-vue@latest asaje deploy-railway ./my-app --service worker

# Redéployer plusieurs services
npx create-asaje-go-vue@latest asaje deploy-railway ./my-app --services api,admin --dry-run
```

---

### `print-railway-config` - Afficher la config résolue

```bash
# Config de l'environnement par défaut
npx create-asaje-go-vue@latest asaje print-railway-config ./my-app

# Config d'un environnement spécifique
npx create-asaje-go-vue@latest asaje print-railway-config ./my-app --environment production

# Format JSON
npx create-asaje-go-vue@latest asaje print-railway-config ./my-app --environment production --json

# Avec secrets (attention!)
npx create-asaje-go-vue@latest asaje print-railway-config ./my-app --environment production --show-secrets
```

---

### `export-railway-config` - Exporter un snapshot

```bash
# Export par défaut
npx create-asaje-go-vue@latest asaje export-railway-config ./my-app

# Export spécifique
npx create-asaje-go-vue@latest asaje export-railway-config ./my-app --environment production --output ./snapshots/railway.prod.json

# Avec secrets
npx create-asaje-go-vue@latest asaje export-railway-config ./my-app --environment production --show-secrets
```

---

### `import-railway-config` - Importer un snapshot

```bash
# Appliquer un snapshot
npx create-asaje-go-vue@latest asaje import-railway-config ./my-app --file ./snapshots/railway.prod.json --yes

# Voir les différences d'abord
npx create-asaje-go-vue@latest asaje import-railway-config ./my-app --file ./snapshots/railway.prod.json --diff --dry-run
```

**Note :** Les snapshots avec `[redacted]` ne peuvent pas être importés. Il faut exporter avec `--show-secrets`.

---

### `diff-railway-config` - Comparer les configs

```bash
# Comparer deux environnements
npx create-asaje-go-vue@latest asaje diff-railway-config ./my-app --environment production --compare-environment staging

# Comparer avec un snapshot
npx create-asaje-go-vue@latest asaje diff-railway-config ./my-app --environment production --compare-file ./snapshots/railway.staging.json

# Comparer deux snapshots (JSON output)
npx create-asaje-go-vue@latest asaje diff-railway-config ./my-app --file ./snapshots/railway.staging.json --compare-file ./snapshots/railway.prod.json --json
```

---

### `destroy-railway` - Supprimer les ressources Railway

```bash
# Supprimer l'environnement courant (défaut)
npx create-asaje-go-vue@latest asaje destroy-railway ./my-app --scope environment --yes

# Supprimer tout le projet Railway (⚠️ DANGER)
npx create-asaje-go-vue@latest asaje destroy-railway ./my-app --scope project --yes

# Preview
npx create-asaje-go-vue@latest asaje destroy-railway ./my-app --dry-run
```

---

## Commandes de maintenance

### `sync-project-config` - Régénérer les manifests locaux

```bash
# Scanner et réécrire asaje.config.json / asaje.railway.json
npx create-asaje-go-vue@latest asaje sync-project-config ./my-app --dry-run
npx create-asaje-go-vue@latest asaje sync-project-config ./my-app --yes
```

---

### `sync-readme` - Régénérer le README

```bash
npx create-asaje-go-vue@latest asaje sync-readme ./my-app
npx create-asaje-go-vue@latest asaje sync-readme ./my-app --dry-run
```

---

### `sync-github-workflow` - Régénérer le workflow GitHub Actions

```bash
npx create-asaje-go-vue@latest asaje sync-github-workflow ./my-app
npx create-asaje-go-vue@latest asaje sync-github-workflow ./my-app --dry-run
```

---

## Configuration (asaje.config.json)

### Structure minimale

```json
{
  "projectName": "Mon Application",
  "projectSlug": "mon-app",
  "template": {
    "repository": "asaje379/boilerplate-go-vue",
    "branch": "main"
  },
  "ports": {
    "admin": 5173,
    "api": 8080,
    "realtime": 8081,
    "landing": 5174,
    "pwa": 5175
  },
  "locale": "fr",
  "services": {
    "storageProvider": "minio",
    "mailProvider": "mailchimp"
  }
}
```

### Configuration Railway complète

```json
{
  "projectName": "Mon Application",
  "projectSlug": "mon-app",
  "railway": {
    "variablesMode": "preserve-remote",
    "services": [
      {
        "key": "api",
        "directory": "api",
        "dockerfile": "api/Dockerfile",
        "aliases": ["api", "backend", "server"]
      },
      {
        "key": "worker",
        "directory": "api",
        "dockerfile": "api/Dockerfile",
        "aliases": ["worker", "api-worker"]
      },
      {
        "key": "realtime",
        "directory": "realtime-gateway",
        "dockerfile": "realtime-gateway/Dockerfile",
        "aliases": ["realtime", "realtime-gateway"]
      },
      {
        "key": "admin",
        "directory": "admin",
        "dockerfile": "admin/Dockerfile",
        "aliases": ["admin", "frontend", "web"]
      },
      {
        "key": "landing",
        "directory": "landing",
        "dockerfile": "landing/Dockerfile"
      },
      {
        "key": "pwa",
        "directory": "pwa",
        "dockerfile": "pwa/Dockerfile"
      }
    ],
    "variables": {
      "shared": {
        "LOG_LEVEL": "info"
      },
      "services": {
        "api": {
          "APP_ENV": "production"
        },
        "admin": {
          "VITE_APP_NAME": "Mon Application"
        }
      }
    },
    "environments": {
      "staging": {
        "railwayEnvironment": "staging",
        "variables": {
          "shared": {
            "APP_STAGE": "staging"
          },
          "services": {
            "admin": {
              "VITE_API_BASE_URL": "https://${{ api.RAILWAY_PUBLIC_DOMAIN }}/api/v1",
              "VITE_REALTIME_BASE_URL": "https://${{ realtime.RAILWAY_PUBLIC_DOMAIN }}"
            }
          }
        }
      },
      "production": {
        "railwayEnvironment": "production",
        "variables": {
          "shared": {
            "APP_STAGE": "production"
          }
        }
      }
    }
  }
}
```

### Modes de variables

| Mode | Description |
|------|-------------|
| `preserve-remote` | Valeurs Railway existantes préservées. CLI génère les defaults uniquement si variable manquante. (défaut) |
| `sync-managed` | Valeurs CLI écrasent les valeurs Railway. Variables Railway non déclarées conservées. |
| `replace` | Désactive les defaults générés. Utilise uniquement les variables déclarées dans `asaje.config.json`. |

---

## Fichiers générés

### asaje.config.json
Configuration déclarative du projet. **À versionner.**

### asaje.railway.json
État du déploiement Railway (IDs des services, resources). **À versionner.**

```json
{
  "appServices": {
    "api": {
      "serviceId": "xxx",
      "serviceName": "mon-app-api"
    }
  },
  "resources": {
    "postgres": { "serviceId": "xxx", "status": "existing" },
    "rabbitmq": { "serviceId": "xxx", "status": "existing" },
    "objectStorage": { "serviceId": "xxx", "bucket": "mon-app" }
  },
  "environmentId": "xxx",
  "environmentName": "production"
}
```

---

## Workflow typique

### 1. Créer un projet

```bash
npx create-asaje-go-vue@latest my-app
cd my-app
```

### 2. Développement local

```bash
# Démarrer tout
npx create-asaje-go-vue@latest asaje start . --yes

# Ou utiliser le Makefile (si créé)
make dev
```

### 3. Premier déploiement Railway

```bash
# Lier Railway
railway login
railway link

# Provisionner et déployer
npx create-asaje-go-vue@latest asaje setup-railway . --yes
```

### 4. Déploiement continu

```bash
# Après des changements locaux
npx create-asaje-go-vue@latest asaje deploy-railway . --yes

# Ou déployer un service spécifique
npx create-asaje-go-vue@latest asaje deploy-railway . --service api
```

### 5. Mise à jour de la config Railway

```bash
# Modifier asaje.config.json
# Puis reconcilier
npx create-asaje-go-vue@latest asaje update-railway . --yes
```

---

## Intégration GitHub Actions

La CLI peut générer un workflow pour le déploiement automatique :

```json
// asaje.config.json
{
  "ci": {
    "githubActions": {
      "deployRailway": {
        "enabled": true,
        "branchEnvironments": {
          "develop": "staging",
          "main": "production"
        }
      }
    }
  }
}
```

Générer le workflow :
```bash
npx create-asaje-go-vue@latest asaje sync-github-workflow .
```

**Prérequis :** Ajouter `RAILWAY_TOKEN` dans les secrets GitHub du repository.

---

## Makefile recommandé

Basé sur ton projet wendo, voici un Makefile typique :

```makefile
.PHONY: dev api-server api-worker realtime landing pwa admin stop logs logs-api logs-worker logs-realtime logs-landing logs-pwa logs-admin

# Démarrer tous les services en background
dev:
	@echo "Starting all services..."
	@(cd api && go run . serve > /tmp/app-api-server.log 2>&1 &)
	@(cd api && go run . worker > /tmp/app-api-worker.log 2>&1 &)
	@(cd realtime-gateway && go run . > /tmp/app-realtime.log 2>&1 &)
	@(cd admin && pnpm dev > /tmp/app-admin.log 2>&1 &)
	@echo "All services started!"
	@echo "  API:      http://localhost:8080"
	@echo "  Realtime: http://localhost:8081"
	@echo "  Admin:    http://localhost:5173"

# Services individuels (foreground)
api-server:
	@cd api && go run . serve

api-worker:
	@cd api && go run . worker

realtime:
	@cd realtime-gateway && go run .

admin:
	@cd admin && pnpm dev

# Arrêter tous les services
stop:
	@echo "Stopping all services..."
	@-pkill -f "api serve" 2>/dev/null || true
	@-pkill -f "api worker" 2>/dev/null || true
	@-pkill -f "realtime-gateway" 2>/dev/null || true
	@-pkill -f "vite" 2>/dev/null || true
	@rm -f /tmp/app-*.log
	@echo "All services stopped"

# Logs
logs:
	@tail -f /tmp/app-*.log

logs-api:
	@tail -f /tmp/app-api-server.log

logs-worker:
	@tail -f /tmp/app-api-worker.log

logs-realtime:
	@tail -f /tmp/app-realtime.log

logs-admin:
	@tail -f /tmp/app-admin.log
```

---

## Variables d'environnement de la CLI

| Variable | Description |
|----------|-------------|
| `ASAJE_TEMPLATE_REPO` | Repository du template (défaut: `asaje379/boilerplate-go-vue`) |
| `ASAJE_TEMPLATE_BRANCH` | Branche du template (défaut: `main`) |
| `RAILWAY_API_TOKEN` ou `RAILWAY_TOKEN` | Token pour l'API Railway |

---

## Dépannage

### "Cannot find module" lors du create

```bash
# Réinstaller la CLI
npm cache clean --force
npx create-asaje-go-vue@latest my-app
```

### Railway CLI non trouvé

```bash
npm install -g @railway/cli
railway --version
```

### Variables Railway non appliquées

```bash
# Vérifier le mode
npx create-asaje-go-vue@latest asaje print-railway-config . --json

# Forcer le sync
npx create-asaje-go-vue@latest asaje sync-railway-env . --yes
```

### Service Railway manquant après setup

```bash
# Re-run setup pour créer les services manquants
npx create-asaje-go-vue@latest asaje setup-railway . --yes
```

---

## Référence rapide des commandes

| Commande | Usage |
|----------|-------|
| `create` | Créer un nouveau projet |
| `start` | Démarrer le développement local |
| `doctor` | Vérifier le setup |
| `update` | Mettre à jour depuis le template |
| `setup-railway` | Provisionner Railway |
| `update-railway` | Mettre à jour Railway |
| `sync-railway-env` | Synchroniser les variables |
| `deploy-railway` | Déployer les services |
| `destroy-railway` | Supprimer Railway |
| `print-railway-config` | Afficher la config |
| `export-railway-config` | Exporter un snapshot |
| `import-railway-config` | Importer un snapshot |
| `diff-railway-config` | Comparer les configs |
| `sync-project-config` | Régénérer les manifests |
| `sync-readme` | Régénérer le README |
| `sync-github-workflow` | Régénérer le workflow CI |
