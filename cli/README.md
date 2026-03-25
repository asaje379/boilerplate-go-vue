# create-asaje-go-vue

CLI package for scaffolding and running the Asaje Go + Vue boilerplate.

## Commands

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

### Provision Railway resources

```bash
npx -p create-asaje-go-vue@latest asaje setup-railway ./my-app
npx -p create-asaje-go-vue@latest asaje setup-railway ./my-app --dry-run
```

### Sync Railway app variables

```bash
npx -p create-asaje-go-vue@latest asaje sync-railway-env ./my-app
npx -p create-asaje-go-vue@latest asaje sync-railway-env ./my-app --dry-run
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

## What `asaje setup-railway` does

- validates the target project structure
- checks that the Railway CLI is installed and authenticated
- reads the linked Railway project context
- provisions PostgreSQL, RabbitMQ, and S3-compatible object storage on Railway
- creates missing Railway app services for `api`, `realtime-gateway`, and `admin`
- wires Railway variables for `api`, `realtime-gateway`, and `admin`
- triggers the first Railway deployment for each app service using the service-local `Dockerfile` and `railway.json`
- generates missing app secrets such as `JWT_SECRET` and `SWAGGER_PASSWORD`, while reusing existing Railway values when present
- supports `--dry-run` to preview provisioning and variable changes without applying them
- writes an `asaje.railway.json` manifest in the target project for future runs, including discovered Railway app service names

## What `asaje sync-railway-env` does

- validates the target project structure
- checks that the Railway CLI is installed and authenticated
- reads the linked Railway project context
- discovers existing Railway app and infra services
- syncs variables for `api`, `realtime-gateway`, and `admin` without provisioning infra resources
- supports `--dry-run` to preview variable changes without applying them

## Useful flags

```bash
node ./bin/create-asaje-go-vue.js my-app --template asaje379/boilerplate-go-vue --branch main
node ./bin/create-asaje-go-vue.js my-app --yes --skip-install --skip-infra
node ./bin/asaje.js start ../my-app --yes --profile backend-only
node ./bin/asaje.js start ../my-app --yes --profile frontend-only
node ./bin/asaje.js start ../my-app --yes --skip-admin --skip-worker
node ./bin/asaje.js doctor ../my-app
node ./bin/asaje.js publish .
node ./bin/asaje.js setup-railway ../my-app --yes
node ./bin/asaje.js setup-railway ../my-app --yes --dry-run
node ./bin/asaje.js sync-railway-env ../my-app --yes
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
