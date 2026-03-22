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
- streams service logs until you stop with `Ctrl+C`

## Useful flags

```bash
node ./bin/create-asaje-go-vue.js my-app --template asaje379/boilerplate-go-vue --branch main
node ./bin/create-asaje-go-vue.js my-app --yes --skip-install --skip-infra
node ./bin/asaje.js start ../my-app --yes --skip-install
node ./bin/asaje.js start ../my-app --yes --skip-admin --skip-worker
```

## Publish checklist

```bash
npm install
npm run check
npm run pack:dry-run
npm publish
```

## Notes

- default template repo comes from `ASAJE_TEMPLATE_REPO` or falls back to `asaje379/boilerplate-go-vue`
- default branch comes from `ASAJE_TEMPLATE_BRANCH` or falls back to `main`
- if the selected branch is missing, the CLI retries `main`, `master`, then `develop`
- the package currently uses `UNLICENSED`; change that before public distribution if needed
- OTP email delivery still requires a valid Mailchimp Transactional key for real email sends
