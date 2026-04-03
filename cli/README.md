# create-asaje-go-vue

CLI package for scaffolding and running the Asaje Go + Vue boilerplate.

## Commands

### Railway command reference

| Command | Purpose |
| --- | --- |
| `asaje sync-project-config [directory]` | Scan the project, detect managed services, and rewrite `asaje.config.json` / `asaje.railway.json` |
| `asaje setup-railway [directory]` | Provision infrastructure, create missing Railway services, wire variables, and deploy |
| `asaje update-railway [directory]` | Reconcile an existing Railway project after changing `asaje.config.json` |
| `asaje sync-railway-env [directory]` | Reapply Railway variables without reprovisioning infra |
| `asaje print-railway-config [directory]` | Print resolved Railway config for one environment |
| `asaje export-railway-config [directory]` | Export resolved Railway config to a JSON snapshot |
| `asaje import-railway-config [directory]` | Apply variables from a previously exported Railway snapshot |
| `asaje diff-railway-config [directory]` | Compare two Railway environments or snapshots |
| `asaje deploy-railway [directory]` | Redeploy managed app services from the current source tree |
| `asaje destroy-railway [directory]` | Delete the linked Railway environment or project |

### Create a project

```bash
npx create-asaje-go-vue@latest my-app
```

Local development:

```bash
cd cli
npm install
node ./bin/create-asaje-go-vue.js my-app
```

### Start a project

After linking or installing the package globally:

```bash
asaje start ./my-app
```

Without global install:

```bash
npx -p create-asaje-go-vue@latest asaje start ./my-app
```

### Check your setup

```bash
npx -p create-asaje-go-vue@latest asaje doctor ./my-app
```

### Validate the package before publish

```bash
npx -p create-asaje-go-vue@latest asaje publish
```

### Update an existing project from the template

```bash
npx -p create-asaje-go-vue@latest asaje update ./my-app --dry-run
npx -p create-asaje-go-vue@latest asaje update ./my-app --yes
npx -p create-asaje-go-vue@latest asaje update ./my-app --include admin/src/stores/session.ts,admin/src/services/http/session.ts
```

### Scan the project and regenerate local config manifests

```bash
npx -p create-asaje-go-vue@latest asaje sync-project-config ./my-app --dry-run
npx -p create-asaje-go-vue@latest asaje sync-project-config ./my-app --yes
```

### Provision Railway resources

```bash
npx -p create-asaje-go-vue@latest asaje setup-railway ./my-app
npx -p create-asaje-go-vue@latest asaje setup-railway ./my-app --dry-run
npx -p create-asaje-go-vue@latest asaje update-railway ./my-app --yes
```

### Sync Railway app variables

```bash
npx -p create-asaje-go-vue@latest asaje sync-railway-env ./my-app
npx -p create-asaje-go-vue@latest asaje sync-railway-env ./my-app --diff --dry-run
npx -p create-asaje-go-vue@latest asaje sync-railway-env ./my-app --dry-run
```

### Print resolved Railway config

```bash
npx -p create-asaje-go-vue@latest asaje print-railway-config ./my-app
npx -p create-asaje-go-vue@latest asaje print-railway-config ./my-app --environment production
npx -p create-asaje-go-vue@latest asaje print-railway-config ./my-app --environment production --json
npx -p create-asaje-go-vue@latest asaje print-railway-config ./my-app --environment production --show-secrets
```

### Export resolved Railway config snapshot

```bash
npx -p create-asaje-go-vue@latest asaje export-railway-config ./my-app
npx -p create-asaje-go-vue@latest asaje export-railway-config ./my-app --environment production
npx -p create-asaje-go-vue@latest asaje export-railway-config ./my-app --environment production --output ./snapshots/railway.production.json
npx -p create-asaje-go-vue@latest asaje export-railway-config ./my-app --environment production --show-secrets
```

### Import a Railway config snapshot

```bash
npx -p create-asaje-go-vue@latest asaje import-railway-config ./my-app --file ./snapshots/railway.production.json --yes
npx -p create-asaje-go-vue@latest asaje import-railway-config ./my-app --file ./snapshots/railway.production.json --diff --dry-run
```

### Diff Railway configs or snapshots

```bash
npx -p create-asaje-go-vue@latest asaje diff-railway-config ./my-app --environment production --compare-environment staging
npx -p create-asaje-go-vue@latest asaje diff-railway-config ./my-app --environment production --compare-file ./snapshots/railway.production.json
npx -p create-asaje-go-vue@latest asaje diff-railway-config ./my-app --file ./snapshots/railway.staging.json --compare-file ./snapshots/railway.production.json --json
```

### Redeploy Railway app services

```bash
npx -p create-asaje-go-vue@latest asaje deploy-railway ./my-app
npx -p create-asaje-go-vue@latest asaje deploy-railway ./my-app --service api
npx -p create-asaje-go-vue@latest asaje deploy-railway ./my-app --services api,admin --dry-run
```

### Destroy Railway resources

```bash
npx -p create-asaje-go-vue@latest asaje destroy-railway ./my-app
npx -p create-asaje-go-vue@latest asaje destroy-railway ./my-app --scope project --yes
```

## What `create` does

- clones the boilerplate from GitHub with `degit`
- removes template-only files such as `cli/`
- asks project setup questions for ports, storage, mail, seeds, and locale
- writes `asaje.config.json`
- generates `admin/.env`, `api/.env`, and `realtime-gateway/.env`
- optionally installs dependencies and starts Docker infrastructure

## What `asaje start` does

- validates project structure
- creates missing `.env` files from examples when possible
- optionally installs dependencies
- optionally starts Docker infrastructure
- starts any combination of `api`, `worker`, `realtime-gateway`, and `admin`
- supports profiles: `full`, `backend-only`, `frontend-only`, and `custom`
- streams service logs until you stop with `Ctrl+C`

## What `asaje doctor` does

- checks required local tools: `node`, `pnpm`, `go`, `docker`
- validates the target project structure
- verifies `.env` files or their corresponding `.env.example` fallbacks

## What `asaje publish` does

- runs `npm run check`
- runs `npm run pack:dry-run`
- prints the final manual npm release steps

## What `asaje update` does

- validates the target project structure
- reads the template repository and branch from `asaje.config.json` when available
- clones the latest template into a temporary directory
- overwrites a safe set of boilerplate-managed files such as Railway config, Dockerfiles, generated Swagger docs, and `.env.example` files
- supports `--include` for explicitly overwriting extra files or directories from the template, such as `admin/src/stores/session.ts`
- supports `--dry-run` to preview which files would be updated
- updates `asaje.config.json` with the template repository and branch used for the update

## What `asaje sync-project-config` does

- scans the project tree for service-local `Dockerfile` files
- infers Railway managed services from the detected directories
- preserves existing service metadata when possible, while updating directories and Dockerfile paths from the scan
- rewrites `asaje.config.json` with the merged `railway.services` list
- rewrites `asaje.railway.json` so local service names line up with the current managed service list
- supports `--dry-run` to preview the rewrite without changing local files

## What `asaje setup-railway` does

- validates the target project structure
- checks that the Railway CLI is installed and authenticated
- reads the linked Railway project context
- provisions PostgreSQL, RabbitMQ, and S3-compatible object storage on Railway
- creates missing Railway app services for the configured app service list
- defaults to `api`, `realtime-gateway`, and `admin` when no custom Railway service config is present
- applies Railway variables from `asaje.config.json` when configured
- keeps the legacy automatic variable wiring for `api`, `realtime-gateway`, and `admin` unless `railway.variablesMode` is set to `replace`
- triggers the first Railway deployment for each app service using the service-local `Dockerfile` and `railway.json`
- generates missing app secrets such as `JWT_SECRET` and `SWAGGER_PASSWORD`, while reusing existing Railway values when present
- supports `--dry-run` to preview provisioning and variable changes without applying them
- writes an `asaje.railway.json` manifest in the target project for future runs, including discovered Railway app service names

## What `asaje update-railway` does

- runs the same reconciliation flow as `setup-railway`
- is intended to be rerun after changing `railway.services`, `railway.variables`, or `railway.environments` in `asaje.config.json`
- provisions any newly configured services/resources that are still missing
- reapplies variables and redeploys the configured app services
- is safe to use repeatedly as an idempotent Railway reconciliation command

## What `asaje sync-railway-env` does

- validates the target project structure
- checks that the Railway CLI is installed and authenticated
- reads the linked Railway project context
- discovers existing Railway app and infra services
- syncs configured Railway variables without provisioning infra resources
- keeps the legacy automatic variable wiring for `api`, `realtime-gateway`, and `admin` unless `railway.variablesMode` is set to `replace`
- supports `--diff` to show what would be added or changed compared with the current Railway variables
- supports `--dry-run` to preview variable changes without applying them

## What `asaje print-railway-config` does

- validates the target project structure locally
- resolves the managed Railway services from `asaje.config.json`
- resolves the selected logical deployment environment and its Railway environment mapping
- computes the final variable set per managed service after all merges and overrides
- supports `--json` for machine-readable output
- redacts secret-looking values in the printed output by default
- supports `--show-secrets` when you explicitly want the raw values in the output

## What `asaje export-railway-config` does

- builds the same resolved config payload as `print-railway-config`
- writes it to a JSON file for snapshotting, auditing, or sharing between environments
- defaults the filename to `.railway-config.<environment>.json` in the project root when `--output` is omitted
- redacts secret-looking values by default
- supports `--show-secrets` when you explicitly want the raw values in the exported file

## What `asaje import-railway-config` does

- reads a JSON snapshot produced by `export-railway-config` or `print-railway-config --json`
- applies the snapshot variables to the current project's Railway services by service key
- supports `--diff` to compare current Railway values with the snapshot before applying
- supports `--dry-run` to preview the import without changing Railway
- rejects snapshots that still contain `[redacted]` placeholders, so secret imports require `--show-secrets` at export time

## What `asaje diff-railway-config` does

- compares two resolved Railway configurations
- supports comparing current project environments with `--environment` and `--compare-environment`
- supports comparing against exported snapshots with `--file` and `--compare-file`
- shows service-level metadata changes and variable-level additions, removals, and modifications
- supports `--json` for machine-readable diff output

## What `asaje deploy-railway` does

- validates the target project structure
- checks that the Railway CLI is installed and authenticated
- reads the linked Railway project context
- discovers the existing Railway app services from the linked project or `asaje.railway.json`
- triggers fresh Railway builds/deployments for the configured app service list from the current local source tree
- defaults to `api`, `realtime-gateway`, and `admin` when no custom Railway service config is present
- supports `--service` and `--services` to redeploy only selected app services
- supports `--dry-run` to preview which services would be redeployed

## Railway Configuration

You can fully describe the managed Railway app services, variables, and deployment environments in `asaje.config.json`.

If the `railway` block is omitted, the CLI keeps the default built-in services and the previous automatic variable behavior.

```json
{
  "projectName": "My App",
  "projectSlug": "my-app",
  "railway": {
    "variablesMode": "merge",
    "services": [
      {
        "key": "api",
        "directory": "api",
        "dockerfile": "api/Dockerfile"
      },
      {
        "key": "admin",
        "directory": "admin",
        "dockerfile": "admin/Dockerfile"
      },
      {
        "key": "realtime",
        "directory": "realtime-gateway",
        "baseName": "realtime-gateway",
        "aliases": ["realtime-gateway"],
        "dockerfile": "realtime-gateway/Dockerfile"
      },
      {
        "key": "worker",
        "directory": "worker-api",
        "baseName": "worker",
        "dockerfile": "worker-api/Dockerfile"
      },
      {
        "key": "marketing",
        "directory": "marketing",
        "baseName": "marketing",
        "serviceName": "my-app-marketing"
      }
    ],
    "variables": {
      "shared": {
        "LOG_LEVEL": "info"
      },
      "services": {
        "api": {
          "APP_ENV": "local"
        },
        "admin": {
          "VITE_APP_NAME": "My App"
        },
        "worker": {
          "WORKER_CONCURRENCY": "4"
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
            "api": {
              "CORS_ALLOWED_ORIGINS": "https://staging-admin.example.com"
            },
            "admin": {
              "VITE_API_BASE_URL": "https://${{ api.RAILWAY_PUBLIC_DOMAIN }}/api/v1",
              "VITE_REALTIME_BASE_URL": "https://${{ realtime-gateway.RAILWAY_PUBLIC_DOMAIN }}"
            }
          }
        }
      },
      "production": {
        "railwayEnvironment": "production",
        "variables": {
          "shared": {
            "APP_STAGE": "production"
          },
          "services": {
            "api": {
              "CORS_ALLOWED_ORIGINS": "https://admin.example.com"
            },
            "admin": {
              "VITE_APP_NAME": "My App"
            }
          }
        }
      }
    }
  }
}
```

Supported top-level Railway fields:

- `variablesMode`: `merge` by default; use `replace` to disable the legacy automatic variables and rely only on `railway.variables`
- `services`: managed Railway application services deployed by `setup-railway` and `deploy-railway`
- `variables.shared`: variables applied to every managed service
- `variables.services.<key>`: variables applied only to one managed service
- `environments.<name>.railwayEnvironment`: optional mapping from a logical config key like `production` to the real Railway environment name or id
- `environments.<name>.variables.shared`: shared variables only for that deployment environment
- `environments.<name>.variables.services.<key>`: service-specific overrides only for that deployment environment

Supported fields per service in `railway.services`:

- `key`: unique internal identifier used in the manifest and CLI selection flags
- `directory`: project-relative directory deployed with `railway up <directory> --path-as-root`
- `baseName`: optional suffix used to build the default Railway service name as `<projectSlug>-<baseName>`
- `serviceName`: optional explicit Railway service name override
- `aliases`: optional extra names that help the CLI match an already-existing Railway service
- `seedImage`: optional bootstrap image used only when `setup-railway` needs to create the Railway service before the first deploy
- `dockerfile`: optional project-relative Dockerfile path validated by the CLI for documentation/safety; Railway still builds from the declared `directory`

How variable merging works:

- `railway.variables.shared`
- then `railway.variables.services.<key>`
- then `railway.environments.<name>.variables.shared`
- then `railway.environments.<name>.variables.services.<key>`

Environment-aware usage:

- `--environment production` can point to either the logical config key or the real Railway environment name/id
- if `--environment` is omitted, the CLI uses the linked Railway environment
- if `railway.environments.default` exists and defines `railwayEnvironment`, it becomes the default target when `--environment` is omitted

Notes:

- the service directory should contain the `Dockerfile` Railway will build from
- custom services are provisioned and deployed by `setup-railway` and `deploy-railway`
- `sync-railway-env` can now apply declarative variables to any managed service key, including custom services
- with `variablesMode: "merge"`, the core services `api`, `realtime-gateway`, and `admin` still receive the legacy generated defaults unless you override them
- with `variablesMode: "replace"`, only the variables declared in `asaje.config.json` are applied
- after changing the Railway config, run `asaje update-railway ./my-app --yes` to reconcile the linked Railway project with the new configuration
- you can target a custom service with `asaje deploy-railway ./my-app --service worker`

## What `asaje destroy-railway` does

- validates the target project structure
- checks that the Railway CLI is installed and authenticated
- deletes either the linked Railway environment or the whole Railway project
- supports `--scope environment` (default) and `--scope project`
- supports `--dry-run` to preview the destructive action without applying it
- removes the local `asaje.railway.json` manifest after a successful deletion

## Useful flags

```bash
node ./bin/create-asaje-go-vue.js my-app --template asaje379/boilerplate-go-vue --branch main
node ./bin/create-asaje-go-vue.js my-app --yes --skip-install --skip-infra
node ./bin/asaje.js start ../my-app --yes --profile backend-only
node ./bin/asaje.js start ../my-app --yes --profile frontend-only
node ./bin/asaje.js start ../my-app --yes --skip-admin --skip-worker
node ./bin/asaje.js doctor ../my-app
node ./bin/asaje.js publish .
node ./bin/asaje.js update ../my-app --dry-run
node ./bin/asaje.js update ../my-app --include admin/src/stores/session.ts --yes
node ./bin/asaje.js setup-railway ../my-app --yes
node ./bin/asaje.js update-railway ../my-app --yes
node ./bin/asaje.js setup-railway ../my-app --yes --dry-run
node ./bin/asaje.js sync-railway-env ../my-app --yes
node ./bin/asaje.js sync-railway-env ../my-app --yes --diff --dry-run
node ./bin/asaje.js print-railway-config ../my-app --environment production
node ./bin/asaje.js print-railway-config ../my-app --environment production --show-secrets
node ./bin/asaje.js export-railway-config ../my-app --environment production
node ./bin/asaje.js import-railway-config ../my-app --file ../snapshots/railway.production.json --yes
node ./bin/asaje.js diff-railway-config ../my-app --environment production --compare-environment staging
node ./bin/asaje.js deploy-railway ../my-app --yes
node ./bin/asaje.js deploy-railway ../my-app --services api,admin --yes
node ./bin/asaje.js destroy-railway ../my-app --scope environment --yes
```

## Publish checklist

```bash
npm install
npm run check
npm run doctor
npm run publish:check
npm run pack:dry-run
npm publish
```

## Notes

- default template repo comes from `ASAJE_TEMPLATE_REPO` or falls back to `asaje379/boilerplate-go-vue`
- default branch comes from `ASAJE_TEMPLATE_BRANCH` or falls back to `main`
- if the selected branch is missing, the CLI retries `main`, `master`, then `develop`
- `asaje setup-railway` works best with `RAILWAY_API_TOKEN` or `RAILWAY_TOKEN` set so it can verify existing remote services before provisioning
- the package currently uses `UNLICENSED`; change that before public distribution if needed
- OTP email delivery still requires a valid Mailchimp Transactional key for real email sends
