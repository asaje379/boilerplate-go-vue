import path from "node:path";
import { buildCreateRailwayServices, resolveRailwayAppServiceSpecs } from "../railway/services.js";

export function buildProjectReadmeContent(answers) {
  const surfaces = [
    "- `admin/`: Vue 3 admin SPA for back-office and internal tooling",
    "- `api/`: Go HTTP API with clean architecture and PostgreSQL",
    "- `realtime-gateway/`: Go realtime transport service for SSE/WebSocket",
    answers.includeLanding ? "- `landing/`: optional public marketing surface" : null,
    answers.includePwa ? "- `pwa/`: optional installable end-user PWA surface" : null,
  ].filter(Boolean).join("\n");

  const ciMappings = (answers.github?.branchEnvironments || [])
    .map((entry) => `- \`${entry.branch}\` -> \`${entry.environment}\``)
    .join("\n");

  return `# ${answers.appName}

Generated with \`create-asaje-go-vue\` / \`asaje\`.

## Stack

- Frontend admin: Vue 3, Vite, Pinia, Vue Router, vue-i18n, shadcn-vue
- API: Go, Gin, GORM, PostgreSQL, JWT
- Async and realtime: RabbitMQ + realtime gateway (SSE/WebSocket)
- File storage: ${answers.storageProvider === "aws" ? "AWS S3" : "MinIO / S3-compatible"}
- Optional mail providers: Mailchimp Transactional, Brevo, SMTP
- Deployment tooling: Railway + GitHub Actions via \`asaje\`

## Project Surfaces

${surfaces}

## How Things Are Linked

- The admin and PWA call the API through domain API modules, not raw fetches.
- The API owns business logic and persistence.
- The API publishes async tasks and realtime events to RabbitMQ.
- The realtime gateway consumes realtime events and pushes them to browsers.
- File uploads go through the API and object storage, with stable media URLs exposed by the API.

## Local Development

Install and start the project with Make:

\`\`\`bash
make install
make infra-up
make start
\`\`\`

Useful local URLs:

- Admin: http://localhost:${answers.adminPort}
${answers.includeLanding ? `- Landing: http://localhost:${answers.landingPort || 8088}
` : ""}${answers.includePwa ? `- PWA: http://localhost:${answers.pwaPort || 4174}
` : ""}- API: http://localhost:${answers.apiPort}/api/v1
- Swagger: http://localhost:${answers.apiPort}/swagger/index.html
- Realtime gateway: http://localhost:${answers.realtimePort}

## Makefile Commands

The generated \`Makefile\` uses the ports selected during \`asaje create\`:

- \`ADMIN_PORT=${answers.adminPort}\`
- \`API_PORT=${answers.apiPort}\`
- \`REALTIME_PORT=${answers.realtimePort}\`
${answers.includeLanding ? `- \`LANDING_PORT=${answers.landingPort || 8088}\`
` : ""}${answers.includePwa ? `- \`PWA_PORT=${answers.pwaPort || 4174}\`
` : ""}
Common commands:

- \`make help\`: show all available targets
- \`make dev\`: start all services in foreground with prefixed logs
- \`make dev-bg\`: start all services in background and write logs to \`/tmp\`
- \`make stop\`: stop background dev services and clear logs
- \`make logs\`: stream all background logs, or use \`SERVICE=api-server\`
- \`make logs-all\`: show the last 100 lines for every service log
- \`make install\`: install frontend dependencies and download Go modules
- \`make infra-up\`: start local Postgres, RabbitMQ, and MinIO
- \`make infra-down\`: stop local infrastructure containers
- \`make start\`: start the configured project through \`asaje start\`
- \`make api\`: start only the API on \`API_PORT\`
- \`make worker\`: start only the API worker
- \`make realtime\`: start only the realtime gateway on \`REALTIME_PORT\`
- \`make admin\`: start only the admin frontend on \`ADMIN_PORT\`
${answers.includeLanding ? "- `make landing`: start only the landing surface on `LANDING_PORT`\n" : ""}${answers.includePwa ? "- `make pwa`: start only the PWA on `PWA_PORT`\n" : ""}- \`make test\`: run Go tests
- \`make type-check\`: run frontend type checks
- \`make sync-config\`: rescan services and regenerate Asaje config
- \`make sync-readme\`: regenerate this README from \`asaje.config.json\`
- \`make sync-workflow\`: regenerate the GitHub Actions Railway workflow

## Asaje Commands

- \`asaje start .\`: run local services
- \`asaje doctor .\`: check tooling and project readiness
- \`asaje update .\`: update managed boilerplate files from the template
- \`asaje sync-project-config .\`: rescan the project and rewrite config manifests
- \`asaje setup-railway .\`: provision Railway resources and first deploy
- \`asaje update-railway .\`: reconcile Railway resources, services, and variables
- \`asaje sync-railway-env .\`: sync only Railway environment variables
- \`asaje deploy-railway .\`: deploy the current source tree to Railway
- \`asaje sync-github-workflow .\`: regenerate the GitHub Actions Railway workflow from config

## Railway And GitHub Actions

- Railway variable mode defaults to \`preserve-remote\`, so existing Railway values are kept unless you explicitly override them in \`asaje.config.json\`.
${answers.github?.enabled ? `- GitHub Actions deploy workflow is generated in \`.github/workflows/deploy-railway.yml\`.
- Branch to environment mapping:
${ciMappings}
- Add \`RAILWAY_TOKEN\` to your GitHub repository secrets before enabling automatic deploys.
` : "- No GitHub Actions Railway workflow was generated during bootstrap. You can enable it later in \`asaje.config.json\` and run \`asaje sync-github-workflow .\`.\n"}
## Important Files

- \`asaje.config.json\`: project config, Railway config, CI/CD metadata
- \`asaje.railway.json\`: local manifest of discovered Railway services/resources
- \`api/notifications.yaml\`: generic notification event/channel templates
- \`api/crons.yaml\`: worker cron configuration

## Notes

- This project is designed to stay modular: keep generic infrastructure in the boilerplate, and move product-specific business logic into your app domain.
- When you add new app surfaces or Dockerfiles, rerun \`asaje sync-project-config .\`.
`;
}

export function buildReadmeAnswersFromProjectConfig(projectDir, projectConfig) {
  const ports = projectConfig?.ports || {};
  const appServiceSpecs = resolveRailwayAppServiceSpecs(projectConfig);
  const githubConfig = getGithubActionsDeployConfig(projectConfig);

  return {
    adminPort: Number(ports.admin || 5173),
    apiPort: Number(ports.api || 8080),
    appName: String(projectConfig?.projectName || path.basename(projectDir)),
    github: githubConfig,
    includeLanding: appServiceSpecs.some((spec) => spec.key === "landing"),
    includePwa: appServiceSpecs.some((spec) => spec.key === "pwa"),
    landingPort: Number(ports.landing || 8088),
    pwaPort: Number(ports.pwa || 4174),
    realtimePort: Number(ports.realtime || 8090),
    storageProvider: String(projectConfig?.services?.storageProvider || "minio"),
  };
}

export function getGithubActionsDeployConfig(projectConfig) {
  const deployRailway = projectConfig?.ci?.githubActions?.deployRailway;
  const rawMappings = Array.isArray(deployRailway?.branchEnvironments) ? deployRailway.branchEnvironments : [];
  const branchEnvironments = rawMappings
    .map((entry) => ({
      branch: String(entry?.branch || "").trim(),
      environment: String(entry?.environment || "").trim(),
    }))
    .filter((entry, index, items) => entry.branch && entry.environment && items.findIndex((candidate) => candidate.branch === entry.branch) === index);

  return {
    branchEnvironments,
    enabled: Boolean(deployRailway?.enabled) && branchEnvironments.length > 0,
  };
}

export function buildGithubWorkflowContent(answers) {
  const branchEnvironments = answers.github.branchEnvironments;
  const branchList = branchEnvironments.map((entry) => `      - ${entry.branch}`).join("\n");

  const branchCase = branchEnvironments
    .map((entry) => `            ${entry.branch}) echo "environment=${entry.environment}" >> "$GITHUB_OUTPUT" ;;
`)
    .join("");

  const managedServices = buildCreateRailwayServices(answers).map((spec) => spec.key);
  const hasLanding = managedServices.includes("landing");
  const hasPwa = managedServices.includes("pwa");

  return `name: Deploy Railway

on:
  push:
    branches:
${branchList}
  workflow_dispatch:

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      admin: \${{ steps.filter.outputs.admin }}
      api: \${{ steps.filter.outputs.api }}
      config: \${{ steps.filter.outputs.config }}
      landing: \${{ steps.filter.outputs.landing }}
      pwa: \${{ steps.filter.outputs.pwa }}
      realtime: \${{ steps.filter.outputs.realtime }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'api/**'
            realtime:
              - 'realtime-gateway/**'
            admin:
              - 'admin/**'
            landing:
              - 'landing/**'
            pwa:
              - 'pwa/**'
            config:
              - 'asaje.config.json'
              - 'asaje.railway.json'
              - 'docker-compose.yml'

  deploy:
    needs: detect-changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Resolve target environment
        id: target
        shell: bash
        run: |
          branch="\${GITHUB_REF_NAME}"
          case "$branch" in
${branchCase}            *) echo "Unsupported branch: $branch" >&2; exit 1 ;;
          esac

      - name: Sync Railway environment
        if: needs.detect-changes.outputs.config == 'true'
        env:
          RAILWAY_TOKEN: \${{ secrets.RAILWAY_TOKEN }}
        run: npx -p create-asaje-go-vue@latest asaje sync-railway-env . --yes --environment \${{ steps.target.outputs.environment }}

      - name: Deploy api
        if: needs.detect-changes.outputs.api == 'true' || needs.detect-changes.outputs.config == 'true'
        env:
          RAILWAY_TOKEN: \${{ secrets.RAILWAY_TOKEN }}
        run: npx -p create-asaje-go-vue@latest asaje deploy-railway . --service api --environment \${{ steps.target.outputs.environment }}

      - name: Deploy worker
        if: needs.detect-changes.outputs.api == 'true' || needs.detect-changes.outputs.config == 'true'
        env:
          RAILWAY_TOKEN: \${{ secrets.RAILWAY_TOKEN }}
        run: npx -p create-asaje-go-vue@latest asaje deploy-railway . --service worker --environment \${{ steps.target.outputs.environment }}

      - name: Deploy realtime
        if: needs.detect-changes.outputs.realtime == 'true' || needs.detect-changes.outputs.config == 'true'
        env:
          RAILWAY_TOKEN: \${{ secrets.RAILWAY_TOKEN }}
        run: npx -p create-asaje-go-vue@latest asaje deploy-railway . --service realtime --environment \${{ steps.target.outputs.environment }}

      - name: Deploy admin
        if: needs.detect-changes.outputs.admin == 'true' || needs.detect-changes.outputs.config == 'true'
        env:
          RAILWAY_TOKEN: \${{ secrets.RAILWAY_TOKEN }}
        run: npx -p create-asaje-go-vue@latest asaje deploy-railway . --service admin --environment \${{ steps.target.outputs.environment }}
${hasLanding ? `
      - name: Deploy landing
        if: needs.detect-changes.outputs.landing == 'true' || needs.detect-changes.outputs.config == 'true'
        env:
          RAILWAY_TOKEN: \${{ secrets.RAILWAY_TOKEN }}
        run: npx -p create-asaje-go-vue@latest asaje deploy-railway . --service landing --environment \${{ steps.target.outputs.environment }}
` : ""}${hasPwa ? `
      - name: Deploy pwa
        if: needs.detect-changes.outputs.pwa == 'true' || needs.detect-changes.outputs.config == 'true'
        env:
          RAILWAY_TOKEN: \${{ secrets.RAILWAY_TOKEN }}
        run: npx -p create-asaje-go-vue@latest asaje deploy-railway . --service pwa --environment \${{ steps.target.outputs.environment }}
` : ""}`;
}
