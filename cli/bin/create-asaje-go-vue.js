#!/usr/bin/env node

import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  cancel,
  confirm,
  intro,
  outro,
  select,
  text,
} from "@clack/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import pc from "picocolors";
import {
  parseCreateArgs,
  parseDeployRailwayArgs,
  parseDestroyRailwayArgs,
  parseDirectoryArgs,
  parseSetupRailwayArgs,
  parseStartArgs,
  parseUpdateArgs,
} from "../src/cli/args.js";
import { toEnvContent, tryReadEnvFile } from "../src/cli/env.js";
import { splitCommaSeparatedPaths, uniquePaths } from "../src/cli/paths.js";
import { prompt } from "../src/cli/prompts.js";
import { checkCommand, createManagedProcess, runCommand } from "../src/cli/process.js";
import { runCliCommand } from "../src/cli/runner.js";
import {
  randomSecret,
  resolveProjectSlug,
  shellEscape,
} from "../src/cli/strings.js";
import { fetchRailwayProjectServices } from "../src/railway/client.js";
import {
  readRailwayManifest as readRailwayManifestFile,
  writeRailwayManifest as writeRailwayManifestFile,
} from "../src/railway/manifest.js";
import {
  DEFAULT_RAILWAY_APP_SERVICE_SPECS,
  buildCreateRailwayServices,
  buildSyncedRailwayManifest,
  findCreatedRailwayService,
  findRailwayService,
  findRailwayServiceByKey,
  normalizeRailwayServiceName,
  normalizeRailwayServices,
  resolveRailwayAppServiceSpecs,
  resolveRailwayServiceName,
  updateRailwayManifestAppServices,
} from "../src/railway/services.js";
import {
  buildGithubWorkflowContent,
  buildProjectReadmeContent,
  buildReadmeAnswersFromProjectConfig,
  getGithubActionsDeployConfig,
} from "../src/project/docs.js";
import { buildProjectMakefileContent } from "../src/project/makefile.js";
import {
  cleanupTemplateFiles,
  cloneTemplate,
  ensureDestinationIsAvailable,
  ensureProjectStructure,
  ensureScaffoldedSurfaces,
  loadProjectConfig,
} from "../src/project/files.js";
import {
  buildSyncedProjectConfig,
  getRailwayConfig,
  scanProjectForManagedRailwayServices,
} from "../src/project/sync.js";
import { collectCreateAnswers } from "../src/create/questions.js";
import { collectStartAnswers } from "../src/start/answers.js";
import {
  ensureEnvFiles,
  installProjectDependencies,
  loadRuntimeConfig,
  startInfrastructure,
} from "../src/start/runtime.js";
import {
  buildRailwayConfigExportFilename,
  buildRailwayConfigSnapshotDiff,
  readRailwayConfigSnapshot,
  sanitizeRailwayConfigSnapshotDiff,
  assertRailwaySnapshotImportable,
} from "../src/railway/snapshot.js";
import {
  assignManagedRailwayServiceVariables,
  buildRailwayBrowserOrigins,
  buildRailwayVariableDiff,
  formatRailwayVariableValue,
  sanitizeVariablesForOutput,
} from "../src/railway/variables.js";
import { resolveInvocation } from "../src/cli/invocation.js";

const DEFAULT_TEMPLATE = process.env.ASAJE_TEMPLATE_REPO || "asaje379/boilerplate-go-vue";
const DEFAULT_BRANCH = process.env.ASAJE_TEMPLATE_BRANCH || "main";
const RAILWAY_MANIFEST_FILENAME = "asaje.railway.json";
const DEFAULT_RAILWAY_BUCKET = "boilerplate-files";
const RAILWAY_SERVICE_DISCOVERY_RETRY_DELAY_MS = 2000;
const RAILWAY_SERVICE_DISCOVERY_RETRY_COUNT = 5;
const SAFE_UPDATE_PATHS = [
  ".github/workflows/deploy-railway.yml",
  "docker-compose.yml",
  "admin/.env.example",
  "admin/Dockerfile",
  "admin/railway.json",
  "admin/nginx",
  "api/.env.example",
  "api/Dockerfile",
  "api/railway.json",
  "api/docs",
  "realtime-gateway/.env.example",
  "realtime-gateway/Dockerfile",
  "realtime-gateway/railway.json",
  "landing/.env.example",
  "landing/Dockerfile",
  "landing/nginx.conf",
  "pwa/.env.example",
  "pwa/Dockerfile",
  "pwa/nginx.conf",
  "pwa/public",
];

await main();

async function main() {
  const invocation = resolveInvocation(process.argv);
  intro(pc.cyan(invocation.title));

  try {
    const completionMessage = await runCliCommand(invocation, {
      printHelp,
      runCreate,
      runDeployRailway,
      runDestroyRailway,
      runDiffRailwayConfig,
      runDoctor,
      runExportRailwayConfig,
      runImportRailwayConfig,
      runPrintRailwayConfig,
      runPublish,
      runSetupRailway,
      runStart,
      runSyncGithubWorkflow,
      runSyncProjectConfig,
      runSyncRailwayEnv,
      runSyncReadme,
      runUpdate,
      runUpdateRailway,
    });
    outro(pc.green(completionMessage));
  } catch (error) {
    if (error instanceof Error) {
      cancel(error.message);
      process.exit(1);
    }

    cancel("Unknown error");
    process.exit(1);
  }
}

function printHelp() {
  console.log(pc.bold("\nCommands"));
  console.log(`- ${pc.bold("create-asaje-go-vue <directory>")} scaffold a new project`);
  console.log(`- ${pc.bold("asaje create <directory>")} scaffold a new project`);
  console.log(`- ${pc.bold("asaje start [directory]")} start a configured project`);
  console.log(`- ${pc.bold("asaje doctor [directory]")} check environment and project readiness`);
  console.log(`- ${pc.bold("asaje publish")} run npm publish checklist for the CLI package`);
  console.log(`- ${pc.bold("asaje update [directory]")} update managed boilerplate files from the template`);
  console.log(`- ${pc.bold("asaje sync-project-config [directory]")} scan the project and rewrite Asaje config manifests`);
  console.log(`- ${pc.bold("asaje sync-readme [directory]")} regenerate the project README from config`);
  console.log(`- ${pc.bold("asaje sync-github-workflow [directory]")} regenerate the GitHub Actions Railway deploy workflow from config`);
  console.log(`- ${pc.bold("asaje setup-railway [directory]")} provision Railway infrastructure for a project`);
  console.log(`- ${pc.bold("asaje update-railway [directory]")} reconcile Railway resources/services/vars from current config`);
  console.log(`- ${pc.bold("asaje sync-railway-env [directory]")} sync Railway app variables without provisioning`);
  console.log(`- ${pc.bold("asaje print-railway-config [directory]")} print resolved Railway config for an environment`);
  console.log(`- ${pc.bold("asaje export-railway-config [directory]")} export resolved Railway config as JSON`);
  console.log(`- ${pc.bold("asaje import-railway-config [directory]")} import a resolved Railway config snapshot into Railway`);
  console.log(`- ${pc.bold("asaje diff-railway-config [directory]")} diff resolved Railway configs or snapshots`);
  console.log(`- ${pc.bold("asaje deploy-railway [directory]")} redeploy the latest code to Railway app services`);
  console.log(`- ${pc.bold("asaje destroy-railway [directory]")} delete the linked Railway environment or project`);
  console.log(pc.bold("\nExamples"));
  console.log(`- ${pc.bold("npx create-asaje-go-vue my-app")}`);
  console.log(`- ${pc.bold("asaje create my-app --yes")}`);
  console.log(`- ${pc.bold("asaje start ../my-app")}`);
  console.log(`- ${pc.bold("asaje doctor ..")}`);
  console.log(`- ${pc.bold("asaje publish")}`);
  console.log(`- ${pc.bold("asaje update .. --dry-run")}`);
  console.log(`- ${pc.bold("asaje sync-project-config .. --dry-run")}`);
  console.log(`- ${pc.bold("asaje sync-readme .. --dry-run")}`);
  console.log(`- ${pc.bold("asaje sync-github-workflow .. --dry-run")}`);
  console.log(`- ${pc.bold("asaje setup-railway ..")}`);
  console.log(`- ${pc.bold("asaje update-railway ..")}`);
  console.log(`- ${pc.bold("asaje sync-railway-env ..")}`);
  console.log(`- ${pc.bold("asaje print-railway-config .. --environment production")}`);
  console.log(`- ${pc.bold("asaje export-railway-config .. --environment production --output ./.railway.production.json")}`);
  console.log(`- ${pc.bold("asaje import-railway-config .. --file ./.railway.production.json --yes")}`);
  console.log(`- ${pc.bold("asaje diff-railway-config .. --environment production --compare-environment staging")}`);
  console.log(`- ${pc.bold("asaje deploy-railway ..")}`);
  console.log(`- ${pc.bold("asaje destroy-railway ..")}`);
}

async function runCreate(argv) {
  const args = parseCreateArgs(argv, { defaultBranch: DEFAULT_BRANCH, defaultTemplate: DEFAULT_TEMPLATE });
  const answers = await collectCreateAnswers(args);
  const destinationDir = path.resolve(process.cwd(), answers.directory);

  await ensureDestinationIsAvailable(destinationDir);

  console.log(pc.dim("\nScaffolding project from GitHub template..."));
  await cloneTemplate(answers.template, answers.branch, destinationDir);
  await cleanupTemplateFiles(destinationDir);
  await ensureScaffoldedSurfaces(destinationDir, answers);
  await writeProjectConfig(destinationDir, answers);
  await writeEnvFiles(destinationDir, answers);
  await writeProjectMakefile(destinationDir, answers);
  await writeProjectReadme(destinationDir, answers);
  await writeGithubWorkflow(destinationDir, answers);

  if (answers.installDependencies) {
    console.log(pc.dim("\nInstalling frontend and Go dependencies..."));
    await installProjectDependencies(destinationDir);
  }

  if (answers.startInfra) {
    console.log(pc.dim("\nStarting local infrastructure with Docker Compose..."));
    await startInfrastructure(destinationDir);
  }

  printCreateSummary(destinationDir, answers);
}

async function collectUpdateAnswers(args) {
  if (args.yes) {
    return args;
  }

  const directory = await prompt(
    text({
      defaultValue: args.directory,
      message: "Project directory to update?",
      placeholder: ".",
      validate(value) {
        return value.trim().length === 0 ? "Project directory is required" : undefined;
      },
    }),
  );

  const include = args.include.length
    ? args.include
    : splitCommaSeparatedPaths(
        await prompt(
          text({
            defaultValue: "",
            message: "Additional files or directories to overwrite from the template? (optional, comma-separated)",
            placeholder: "admin/src/stores/session.ts,admin/src/services/http/session.ts",
          }),
        ),
      );

  return {
    branch: args.branch,
    directory,
    dryRun: args.dryRun,
    include,
    template: args.template,
    yes: true,
  };
}

async function writeProjectConfig(destinationDir, answers) {
  const config = {
    projectName: answers.appName,
    projectSlug: answers.slug,
    template: {
      branch: answers.branch,
      repository: answers.template,
    },
    ports: {
      admin: answers.adminPort,
      api: answers.apiPort,
      landing: 8088,
      pwa: 4174,
      realtime: answers.realtimePort,
    },
    locale: answers.defaultLocale,
    services: {
      storageProvider: answers.storageProvider,
      mailProvider: answers.mailProvider,
    },
    railway: {
      environments: buildCreateRailwayEnvironments(answers),
      services: buildCreateRailwayServices(answers),
    },
    ci: {
      githubActions: {
        deployRailway: {
          branchEnvironments: answers.github.branchEnvironments,
          enabled: answers.github.enabled,
        },
      },
    },
  };

  await fs.writeJson(path.join(destinationDir, "asaje.config.json"), config, { spaces: 2 });
}

function buildCreateRailwayEnvironments(answers) {
  const environments = {};
  for (const mapping of answers.github.branchEnvironments || []) {
    if (!mapping.environment) {
      continue;
    }
    environments[mapping.environment] = {
      railwayEnvironment: mapping.environment,
    };
  }
  return environments;
}

async function writeEnvFiles(destinationDir, answers) {
  await fs.ensureDir(path.join(destinationDir, "admin"));
  await fs.writeFile(
    path.join(destinationDir, "admin/.env"),
    toEnvContent({
      VITE_APP_NAME: answers.appName,
      VITE_API_BASE_URL: `http://localhost:${answers.apiPort}/api/v1`,
      VITE_API_TIMEOUT_MS: "15000",
      VITE_REALTIME_BASE_URL: `http://localhost:${answers.realtimePort}`,
      VITE_REALTIME_DEFAULT_TRANSPORT: "ws",
      VITE_REALTIME_RECONNECT_DELAY_MS: "3000",
    }),
  );

  const apiEnv = {
    PORT: String(answers.apiPort),
    DATABASE_URL: `postgres://postgres:postgres@localhost:5432/${answers.databaseName}?sslmode=disable`,
    JWT_SECRET: answers.jwtSecret,
    ACCESS_TOKEN_TTL_MINUTES: "60",
    REFRESH_TOKEN_TTL_MINUTES: "10080",
    FILE_SIGNED_URL_TTL_MINUTES: "15",
    FILE_MAX_SIZE_MB: "25",
    LOGIN_OTP_TTL_MINUTES: "10",
    PASSWORD_RESET_OTP_TTL_MINUTES: "15",
    DEFAULT_LOCALE: answers.defaultLocale,
    ADMIN_NAME: answers.admin?.name || "Admin",
    ADMIN_EMAIL: answers.admin?.email || "",
    ADMIN_PASSWORD: answers.admin?.password || "",
    SEED_USER_NAME: answers.standardUser?.name || "User",
    SEED_USER_EMAIL: answers.standardUser?.email || "",
    SEED_USER_PASSWORD: answers.standardUser?.password || "",
    SWAGGER_USERNAME: answers.swaggerUsername,
    SWAGGER_PASSWORD: answers.swaggerPassword,
    CORS_ALLOWED_ORIGINS: answers.corsAllowedOrigins.join(","),
    PUBLIC_API_BASE_URL: `http://localhost:${answers.apiPort}`,
    RATE_LIMIT_RPM: "120",
    RATE_LIMIT_BURST: "60",
    REGISTER_ALLOWED_EMAILS: "",
    REGISTER_ALLOWED_DOMAINS: "",
    OBJECT_STORAGE_PROVIDER: answers.storageProvider,
    AWS_ENDPOINT_URL: answers.storageProvider === "aws" ? answers.aws.endpointUrl : "",
    AWS_ACCESS_KEY_ID: answers.storageProvider === "aws" ? answers.aws.accessKeyId : "",
    AWS_SECRET_ACCESS_KEY: answers.storageProvider === "aws" ? answers.aws.secretAccessKey : "",
    AWS_S3_BUCKET: answers.storageProvider === "aws" ? answers.aws.bucket : "",
    BUCKET_BASE_PATH: answers.bucketBasePath,
    AWS_REGION: answers.storageProvider === "aws" ? answers.aws.region : "us-east-1",
    MINIO_ENDPOINT: answers.storageProvider === "minio" ? answers.minio.endpoint : "",
    MINIO_PORT: answers.storageProvider === "minio" ? String(answers.minio.port) : "",
    MINIO_USE_SSL: answers.storageProvider === "minio" ? String(answers.minio.useSSL) : "",
    MINIO_ACCESS_KEY: answers.storageProvider === "minio" ? answers.minio.accessKey : "",
    MINIO_SECRET_KEY: answers.storageProvider === "minio" ? answers.minio.secretKey : "",
    MINIO_BUCKET_NAME: answers.storageProvider === "minio" ? answers.minio.bucket : "",
    MINIO_PUBLIC_URL: answers.storageProvider === "minio" ? answers.minio.publicUrl : "",
    MAIL_PROVIDER: answers.mailProvider,
    MAILCHIMP_TRANSACTIONAL_API_KEY: answers.mailchimpApiKey,
    BREVO_API_KEY: answers.brevoApiKey,
    MAIL_FROM_EMAIL: answers.mailFromEmail,
    MAIL_FROM_NAME: answers.mailFromName,
    SMTP_HOST: answers.smtp.host,
    SMTP_PORT: String(answers.smtp.port),
    SMTP_USERNAME: answers.smtp.username,
    SMTP_PASSWORD: answers.smtp.password,
    SMTP_USE_SSL: String(answers.smtp.useSSL),
    RABBITMQ_URL: "amqp://guest:guest@localhost:5672/",
    RABBITMQ_TASKS_EXCHANGE: "boilerplate.tasks",
    RABBITMQ_REALTIME_EXCHANGE: "boilerplate.realtime",
    RABBITMQ_WORKER_QUEUE: `${answers.slug || "asaje-app"}.api.worker`,
    RABBITMQ_WORKER_CONSUMER_TAG: `${answers.slug || "asaje-app"}-api-worker`,
  };

  await fs.ensureDir(path.join(destinationDir, "api"));
  await fs.writeFile(path.join(destinationDir, "api/.env"), toEnvContent(apiEnv));

  await fs.ensureDir(path.join(destinationDir, "realtime-gateway"));
  await fs.writeFile(
    path.join(destinationDir, "realtime-gateway/.env"),
    toEnvContent({
      PORT: String(answers.realtimePort),
      JWT_SECRET: answers.jwtSecret,
      RABBITMQ_URL: "amqp://guest:guest@localhost:5672/",
      RABBITMQ_REALTIME_EXCHANGE: "boilerplate.realtime",
      CORS_ALLOWED_ORIGINS: answers.corsAllowedOrigins.join(","),
      REALTIME_INSTANCE_ID: `${answers.slug || "asaje-app"}-realtime`,
      REALTIME_QUEUE_PREFIX: `${answers.slug || "asaje-app"}.realtime`,
      REALTIME_HEARTBEAT_SECONDS: "25",
      REALTIME_WRITE_TIMEOUT_SECONDS: "10",
    }),
  );

  if (answers.includeLanding) {
    await fs.ensureDir(path.join(destinationDir, "landing"));
    await fs.writeFile(
      path.join(destinationDir, "landing/.env"),
      toEnvContent({
        API_BASE_URL: `http://localhost:${answers.apiPort}`,
        PWA_BASE_URL: "http://localhost:4174",
      }),
    );
  }

  if (answers.includePwa) {
    await fs.ensureDir(path.join(destinationDir, "pwa"));
    await fs.writeFile(
      path.join(destinationDir, "pwa/.env"),
      toEnvContent({
        VITE_APP_NAME: `${answers.appName} PWA`,
        VITE_API_BASE_URL: `http://localhost:${answers.apiPort}/api/v1`,
        VITE_REALTIME_BASE_URL: `http://localhost:${answers.realtimePort}`,
      }),
    );
  }
}

async function writeGithubWorkflow(destinationDir, answers) {
  if (!answers.github?.enabled || !answers.github.branchEnvironments?.length) {
    return;
  }

  const workflowPath = path.join(destinationDir, ".github/workflows/deploy-railway.yml");
  await fs.ensureDir(path.dirname(workflowPath));
  await fs.writeFile(workflowPath, buildGithubWorkflowContent(answers));
}

async function writeProjectReadme(destinationDir, answers) {
  await fs.writeFile(path.join(destinationDir, "README.md"), buildProjectReadmeContent(answers));
}

async function writeProjectMakefile(destinationDir, answers) {
  await fs.writeFile(path.join(destinationDir, "Makefile"), buildProjectMakefileContent(answers));
}

async function writeGithubWorkflowFromProjectConfig(projectDir, projectConfig) {
  const workflowConfig = getGithubActionsDeployConfig(projectConfig);
  if (!workflowConfig.enabled || workflowConfig.branchEnvironments.length === 0) {
    return;
  }

  const answers = {
    github: workflowConfig,
    includeLanding: resolveRailwayAppServiceSpecs(projectConfig).some((spec) => spec.key === "landing"),
    includePwa: resolveRailwayAppServiceSpecs(projectConfig).some((spec) => spec.key === "pwa"),
  };
  const workflowPath = path.join(projectDir, ".github/workflows/deploy-railway.yml");
  await fs.ensureDir(path.dirname(workflowPath));
  await fs.writeFile(workflowPath, buildGithubWorkflowContent(answers));
}

function printCreateSummary(destinationDir, answers) {
  console.log(pc.green("\nSetup complete."));
  console.log(`- Project: ${pc.bold(answers.appName)}`);
  console.log(`- Directory: ${pc.bold(destinationDir)}`);
  console.log(`- Template: ${pc.bold(`${answers.template}#${answers.branch}`)}`);
  console.log(`- Storage: ${pc.bold(answers.storageProvider)}`);
  console.log(`- Admin URL: ${pc.bold(`http://localhost:${answers.adminPort}`)}`);
  if (answers.includeLanding) {
    console.log(`- Landing URL: ${pc.bold("http://localhost:8088")}`);
  }
  if (answers.includePwa) {
    console.log(`- PWA URL: ${pc.bold("http://localhost:4174")}`);
  }
  console.log(`- API URL: ${pc.bold(`http://localhost:${answers.apiPort}/api/v1`)}`);
  console.log(`- Realtime URL: ${pc.bold(`http://localhost:${answers.realtimePort}`)}`);
  console.log(`- Swagger: ${pc.bold(`http://localhost:${answers.apiPort}/swagger/index.html`)}`);
  if (answers.admin) {
    console.log(`- Seed admin: ${pc.bold(`${answers.admin.email} / ${answers.admin.password}`)}`);
  } else {
    console.log(`- First admin: ${pc.bold("created later from /setup")}`);
  }
  if (answers.standardUser) {
    console.log(`- Seed user: ${pc.bold(`${answers.standardUser.email} / ${answers.standardUser.password}`)}`);
  }

  console.log(pc.dim("\nNext commands:"));
  console.log(`  cd ${shellEscape(destinationDir)}`);
  console.log("  docker compose up -d");
  console.log(`  npx -p create-asaje-go-vue asaje start ${shellEscape(destinationDir)}`);
  console.log(pc.dim("\nNote: transactional email delivery depends on the configured provider credentials."));
}

async function runStart(argv) {
  const args = parseStartArgs(argv);
  const answers = await collectStartAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);

  await ensureProjectStructure(projectDir);
  await ensureEnvFiles(projectDir, {
    onCreated(spec) {
      console.log(pc.yellow(`- Created ${spec.envPath} from ${spec.examplePath}`));
    },
  });

  if (answers.installDependencies) {
    console.log(pc.dim("\nInstalling frontend and Go dependencies..."));
    await installProjectDependencies(projectDir);
  }

  if (answers.startInfra) {
    console.log(pc.dim("\nStarting local infrastructure with Docker Compose..."));
    await startInfrastructure(projectDir);
  }

  if (answers.selectedServices.length === 0) {
    console.log(pc.yellow("\nNo application services selected. Infrastructure step completed."));
    return;
  }

  const runtimeConfig = await loadRuntimeConfig(projectDir);
  printStartSummary(projectDir, runtimeConfig, answers.profile, answers.selectedServices);
  await startManagedProcesses(projectDir, runtimeConfig, answers.selectedServices);
}

async function runDoctor(argv) {
  const args = parseDirectoryArgs(argv);
  const projectDir = path.resolve(process.cwd(), args.directory || ".");
  const results = [];

  console.log(pc.bold("\nTooling"));
  for (const tool of [
    { command: "node", args: ["--version"], name: "node" },
    { command: "pnpm", args: ["--version"], name: "pnpm" },
    { command: "go", args: ["version"], name: "go" },
    { command: "docker", args: ["--version"], name: "docker" },
  ]) {
    results.push(await checkCommand(tool));
  }

  console.log(pc.bold("\nProject"));
  if (await fs.pathExists(projectDir)) {
    results.push({ message: `project directory found: ${projectDir}`, ok: true });
  } else {
    results.push({ message: `project directory missing: ${projectDir}`, ok: false });
  }

  if (await fs.pathExists(projectDir)) {
    for (const relativePath of ["admin", "api", "realtime-gateway", "docker-compose.yml"]) {
      const exists = await fs.pathExists(path.join(projectDir, relativePath));
      results.push({
        message: `${relativePath} ${exists ? "present" : "missing"}`,
        ok: exists,
      });
    }

    for (const spec of ENV_FILE_SPECS) {
      const serviceDir = spec.envPath.split("/")[0];
      if (!(await fs.pathExists(path.join(projectDir, serviceDir)))) {
        continue;
      }
      const envExists = await fs.pathExists(path.join(projectDir, spec.envPath));
      const exampleExists = await fs.pathExists(path.join(projectDir, spec.examplePath));
      results.push({
        message: `${spec.envPath} ${envExists ? "present" : exampleExists ? `missing (can be created from ${spec.examplePath})` : "missing"}`,
        ok: envExists || exampleExists,
      });
    }
  }

  let hasFailure = false;
  for (const result of results) {
    const icon = result.ok ? pc.green("OK") : pc.red("FAIL");
    console.log(`- ${icon} ${result.message}`);
    if (!result.ok) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    throw new Error("Doctor found blocking issues.");
  }
}

async function runPublish(argv) {
  const args = parseDirectoryArgs(argv);
  const packageDir = path.resolve(process.cwd(), args.directory || ".");
  const packageJsonPath = path.join(packageDir, "package.json");

  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error(`No package.json found in ${packageDir}`);
  }

  console.log(pc.bold("\nPublish checks"));
  await runCommand("npm", ["run", "check"], packageDir);
  await runCommand("npm", ["run", "pack:dry-run"], packageDir);

  console.log(pc.bold("\nManual release checklist"));
  console.log(`- Verify npm account with ${pc.bold("npm whoami")}`);
  console.log(`- Confirm package name availability with ${pc.bold("npm view create-asaje-go-vue")}`);
  console.log(`- Publish with ${pc.bold("npm publish")}`);
}

async function runUpdate(argv) {
  const args = parseUpdateArgs(argv);
  const answers = await collectUpdateAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);

  await ensureProjectStructure(projectDir);

  const projectConfig = await loadProjectConfig(projectDir);
  const templateRepository = answers.template || projectConfig?.template?.repository || DEFAULT_TEMPLATE;
  const templateBranch = answers.branch || projectConfig?.template?.branch || DEFAULT_BRANCH;
  const templateDir = await fs.mkdtemp(path.join(os.tmpdir(), "asaje-update-"));

  try {
    console.log(pc.dim(`\nCloning template ${templateRepository}#${templateBranch}...`));
    await cloneTemplate(templateRepository, templateBranch, templateDir);
    await cleanupTemplateFiles(templateDir);

    const selectedPaths = uniquePaths([...SAFE_UPDATE_PATHS, ...answers.include]);
    const summary = await applyTemplateUpdates({
      dryRun: answers.dryRun,
      projectDir,
      selectedPaths,
      templateDir,
    });

    if (!answers.dryRun) {
      await updateProjectTemplateConfig(projectDir, projectConfig, templateRepository, templateBranch);
    }

    printUpdateSummary({
      branch: templateBranch,
      dryRun: answers.dryRun,
      include: answers.include,
      projectDir,
      repository: templateRepository,
      summary,
    });
  } finally {
    await fs.remove(templateDir);
  }
}

async function runSyncProjectConfig(argv) {
  const args = await collectSyncProjectConfigAnswers(parseSyncProjectConfigArgs(argv));
  const projectDir = path.resolve(process.cwd(), args.directory);

  await ensureProjectStructure(projectDir);

  const projectConfig = await loadProjectConfig(projectDir);
  const manifest = await readRailwayManifest(projectDir);
  const scanSummary = await scanProjectForManagedRailwayServices(projectDir);
  const nextProjectConfig = buildSyncedProjectConfig(projectDir, projectConfig, scanSummary.serviceSpecs);
  const nextManifest = buildSyncedRailwayManifest(manifest, nextProjectConfig, scanSummary.serviceSpecs);

  if (!args.dryRun) {
    await writeProjectConfigFile(projectDir, nextProjectConfig);
    await writeRailwayManifest(projectDir, nextManifest);
    await writeGithubWorkflowFromProjectConfig(projectDir, nextProjectConfig);
  }

  printSyncProjectConfigSummary({
    dryRun: args.dryRun,
    manifest,
    nextManifest,
    nextProjectConfig,
    previousProjectConfig: projectConfig,
    projectDir,
    scanSummary,
  });
}

async function runSyncReadme(argv) {
  const args = parseSyncReadmeArgs(argv);
  const projectDir = path.resolve(process.cwd(), args.directory);

  await ensureProjectStructure(projectDir);

  const projectConfig = await loadProjectConfig(projectDir);
  const answers = buildReadmeAnswersFromProjectConfig(projectDir, projectConfig);
  const readmePath = path.join(projectDir, "README.md");

  if (args.dryRun) {
    console.log(pc.green("\nREADME preview."));
    console.log(`- Directory: ${pc.bold(projectDir)}`);
    console.log(`- README: ${pc.bold(readmePath)}`);
    console.log(`- App: ${pc.bold(answers.appName)}`);
    console.log("- Dry run only, README file was not changed");
    return;
  }

  await writeProjectReadme(projectDir, answers);
  console.log(pc.green("\nREADME generated."));
  console.log(`- README: ${pc.bold(readmePath)}`);
}

async function runSyncGithubWorkflow(argv) {
  const args = parseSyncGithubWorkflowArgs(argv);
  const projectDir = path.resolve(process.cwd(), args.directory);

  await ensureProjectStructure(projectDir);

  const projectConfig = await loadProjectConfig(projectDir);
  const workflowConfig = getGithubActionsDeployConfig(projectConfig);
  const workflowPath = path.join(projectDir, ".github/workflows/deploy-railway.yml");

  if (!workflowConfig.enabled) {
    console.log(pc.yellow("- GitHub Actions Railway deploy workflow is not enabled in asaje.config.json"));
    console.log(pc.dim("  Set ci.githubActions.deployRailway.enabled=true and define branchEnvironments first."));
    return;
  }

  if (args.dryRun) {
    console.log(pc.green("\nGitHub workflow preview."));
    console.log(`- Directory: ${pc.bold(projectDir)}`);
    console.log(`- Workflow: ${pc.bold(workflowPath)}`);
    console.log(`- Branch mappings: ${pc.bold(workflowConfig.branchEnvironments.map((entry) => `${entry.branch} -> ${entry.environment}`).join(", "))}`);
    console.log("- Dry run only, workflow file was not changed");
    return;
  }

  await writeGithubWorkflowFromProjectConfig(projectDir, projectConfig);
  console.log(pc.green("\nGitHub workflow generated."));
  console.log(`- Workflow: ${pc.bold(workflowPath)}`);
  console.log(`- Branch mappings: ${pc.bold(workflowConfig.branchEnvironments.map((entry) => `${entry.branch} -> ${entry.environment}`).join(", "))}`);
}

async function runSetupRailway(argv) {
  const args = parseSetupRailwayArgs(argv, { defaultBucket: DEFAULT_RAILWAY_BUCKET });
  const answers = await collectSetupRailwayAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);
  const projectConfig = await loadProjectConfig(projectDir);
  const projectSlug = resolveProjectSlug(projectDir, projectConfig);
  const appServiceSpecs = resolveRailwayAppServiceSpecs(projectConfig);
  const selectedSpecs = resolveDeployRailwaySpecs(answers.services, appServiceSpecs);
  const requestedRailwayEnvironment = resolveRequestedRailwayEnvironmentRef(projectConfig, answers.environment);

  await ensureProjectStructure(projectDir);
  await ensureRailwayAppServiceTargets(projectDir, selectedSpecs);
  await ensureRailwayCliInstalled();
  await ensureRailwayAuthenticated(projectDir, requestedRailwayEnvironment);
  await ensureRailwayEnvironmentLinked(projectDir, requestedRailwayEnvironment);

  const manifest = await readRailwayManifest(projectDir);
  manifest.resources ||= {};
  const railwayContext = await loadRailwayContext(projectDir, requestedRailwayEnvironment);
  const environmentSelection = resolveRailwayEnvironmentSelection(projectConfig, answers.environment, railwayContext);
  railwayContext.environmentConfigKey = environmentSelection.configKey;
  railwayContext.environmentRef = environmentSelection.railwayEnvironment || railwayContext.environmentId || railwayContext.environmentName;
  const existingServices = await discoverRailwayServices(railwayContext, projectDir);
  const resourceSummary = [];
  const appServiceSummary = [];
  const deploySummary = [];
  const variableSummary = [];

  console.log(pc.bold("\nProvisioning"));

  const postgresResult = await ensureRailwayResource({
    aliases: ["postgres", "postgresql"],
    commandArgs: ["add", "--database", "postgres"],
    dryRun: answers.dryRun,
    existingServices,
    key: "postgres",
    manifest,
    projectDir,
    railwayContext,
  });
  resourceSummary.push(postgresResult);

  const rabbitMqResult = await ensureRailwayResource({
    aliases: ["rabbitmq"],
    commandArgs: [
      "add",
      "--service",
      "rabbitmq",
      "--image",
      "rabbitmq:4.1-management-alpine",
      "--variables",
      "RABBITMQ_DEFAULT_USER=app",
      "--variables",
      `RABBITMQ_DEFAULT_PASS=${randomSecret(18)}`,
      "--variables",
      `RABBITMQ_ERLANG_COOKIE=${randomSecret(24)}`,
    ],
    dryRun: answers.dryRun,
    existingServices,
    key: "rabbitmq",
    manifest,
    projectDir,
    railwayContext,
  });
  resourceSummary.push(rabbitMqResult);

  const objectStorageResult = await ensureRailwayResource({
    aliases: ["object-storage", "storage", "simple-s3", "minio"],
    commandArgs: [
      "deploy",
      "--template",
      "simple-s3",
      "--variable",
      `MINIO_BUCKET=${answers.bucket}`,
    ],
    dryRun: answers.dryRun,
    existingServices,
    key: "objectStorage",
    manifest,
    metadata: { bucket: answers.bucket },
    projectDir,
    railwayContext,
  });
  resourceSummary.push(objectStorageResult);

  console.log(pc.bold("\nApplication services"));
  manifest.appServices ||= {};
  for (const spec of selectedSpecs) {
    const serviceName = resolveRailwayServiceName(spec, projectSlug);
    const serviceResult = await ensureRailwayAppService({
      aliases: spec.aliases,
      dryRun: answers.dryRun,
      existingServices,
      key: spec.key,
      manifest,
      projectDir,
      railwayContext,
      serviceName,
      seedImage: spec.seedImage,
    });
    appServiceSummary.push(serviceResult);
  }

  manifest.bucket = answers.bucket;
  manifest.environmentId = railwayContext.environmentId || manifest.environmentId || null;
  manifest.environmentName = railwayContext.environmentName || manifest.environmentName || null;
  manifest.projectId = railwayContext.projectId || manifest.projectId || null;
  manifest.projectName = railwayContext.projectName || manifest.projectName || null;
  manifest.projectSlug = projectSlug;
  manifest.updatedAt = new Date().toISOString();

  const servicesAfterProvision = await discoverRailwayServices(railwayContext, projectDir);
  updateRailwayManifestAppServices(manifest, servicesAfterProvision, appServiceSpecs, projectSlug);
  await wireRailwayVariables({
    appServiceSpecs,
    dryRun: answers.dryRun,
    environmentSelection,
    manifest,
    projectConfig,
    projectDir,
    railwayContext,
    services: servicesAfterProvision,
    summary: variableSummary,
  });
  const deploymentResults = await deployRailwayAppServices({
    availableSpecs: appServiceSpecs,
    dryRun: answers.dryRun,
    manifest,
    messagePrefix: "asaje setup-railway",
    projectDir,
    projectSlug,
    railwayContext,
    selectedSpecs,
    services: servicesAfterProvision,
  });
  deploySummary.push(...deploymentResults);

  if (!answers.dryRun) {
    await writeRailwayManifest(projectDir, manifest);
  }
  printRailwaySetupSummary({
    appServiceSummary,
    bucket: answers.bucket,
    deploySummary,
    dryRun: answers.dryRun,
    projectDir,
    railwayContext,
    resourceSummary,
    variableSummary,
  });
}

async function runUpdateRailway(argv) {
  await runSetupRailway(argv);
}

async function runSyncRailwayEnv(argv) {
  const args = parseSetupRailwayArgs(argv, { defaultBucket: DEFAULT_RAILWAY_BUCKET });
  const answers = await collectSetupRailwayAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);
  const projectConfig = await loadProjectConfig(projectDir);
  const projectSlug = resolveProjectSlug(projectDir, projectConfig);
  const appServiceSpecs = resolveRailwayAppServiceSpecs(projectConfig);
  const requestedRailwayEnvironment = resolveRequestedRailwayEnvironmentRef(projectConfig, answers.environment);

  await ensureProjectStructure(projectDir);
  await ensureRailwayAppServiceTargets(projectDir, appServiceSpecs);
  await ensureRailwayCliInstalled();
  await ensureRailwayAuthenticated(projectDir, requestedRailwayEnvironment);
  await ensureRailwayEnvironmentLinked(projectDir, requestedRailwayEnvironment);

  const manifest = await readRailwayManifest(projectDir);
  manifest.resources ||= {};
  manifest.appServices ||= {};

  const railwayContext = await loadRailwayContext(projectDir, requestedRailwayEnvironment);
  const environmentSelection = resolveRailwayEnvironmentSelection(projectConfig, answers.environment, railwayContext);
  railwayContext.environmentConfigKey = environmentSelection.configKey;
  railwayContext.environmentRef = environmentSelection.railwayEnvironment || railwayContext.environmentId || railwayContext.environmentName;
  const services = await discoverRailwayServices(railwayContext, projectDir);
  const variableSummary = [];

  updateRailwayManifestAppServices(manifest, services, appServiceSpecs, projectSlug);
  await wireRailwayVariables({
    appServiceSpecs,
    diff: answers.diff,
    dryRun: answers.dryRun,
    environmentSelection,
    manifest,
    projectConfig,
    projectDir,
    railwayContext,
    services,
    summary: variableSummary,
  });

  manifest.bucket = manifest.bucket || answers.bucket;
  manifest.environmentId = railwayContext.environmentId || manifest.environmentId || null;
  manifest.environmentName = railwayContext.environmentName || manifest.environmentName || null;
  manifest.projectId = railwayContext.projectId || manifest.projectId || null;
  manifest.projectName = railwayContext.projectName || manifest.projectName || null;
  manifest.projectSlug = manifest.projectSlug || projectSlug;
  manifest.updatedAt = new Date().toISOString();

  if (!answers.dryRun) {
    await writeRailwayManifest(projectDir, manifest);
  }

  printRailwaySetupSummary({
    appServiceSummary: [],
    bucket: manifest.bucket || answers.bucket,
    deploySummary: [],
    diffMode: answers.diff,
    dryRun: answers.dryRun,
    projectDir,
    railwayContext,
    resourceSummary: [],
    variableSummary,
  });
}

async function runPrintRailwayConfig(argv) {
  const args = parsePrintRailwayConfigArgs(argv);
  const payload = await buildResolvedRailwayConfigPayload({
    directory: args.directory,
    environment: args.environment,
    showSecrets: args.showSecrets,
  });

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printResolvedRailwayConfig(payload);
}

async function runExportRailwayConfig(argv) {
  const args = parseExportRailwayConfigArgs(argv);
  const payload = await buildResolvedRailwayConfigPayload({
    directory: args.directory,
    environment: args.environment,
    showSecrets: args.showSecrets,
  });

  const outputPath = path.resolve(process.cwd(), args.output || buildRailwayConfigExportFilename(payload));
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeJson(outputPath, payload, { spaces: 2 });
  console.log(`- Exported to ${pc.bold(outputPath)}`);
}

async function runImportRailwayConfig(argv) {
  const args = await collectImportRailwayConfigAnswers(parseImportRailwayConfigArgs(argv));
  const projectDir = path.resolve(process.cwd(), args.directory);
  const projectConfig = await loadProjectConfig(projectDir);
  const requestedRailwayEnvironment = resolveRequestedRailwayEnvironmentRef(projectConfig, args.environment);
  const snapshot = await readRailwayConfigSnapshot(args.file);
  const currentPayload = await buildResolvedRailwayConfigPayload({
    directory: args.directory,
    environment: args.environment,
    showSecrets: true,
  });

  assertRailwaySnapshotImportable(snapshot);

  await ensureProjectStructure(projectDir);
  await ensureRailwayCliInstalled();
  await ensureRailwayAuthenticated(projectDir, requestedRailwayEnvironment);
  await ensureRailwayEnvironmentLinked(projectDir, requestedRailwayEnvironment);

  const railwayContext = await loadRailwayContext(projectDir, requestedRailwayEnvironment);
  railwayContext.environmentRef = requestedRailwayEnvironment || railwayContext.environmentId || railwayContext.environmentName;

  console.log(pc.bold("\nImport Railway config"));
  console.log(`- Source: ${pc.bold(path.resolve(process.cwd(), args.file))}`);
  console.log(`- Target directory: ${pc.bold(projectDir)}`);
  if (railwayContext.environmentName || railwayContext.environmentId) {
    console.log(`- Target environment: ${pc.bold(railwayContext.environmentName || railwayContext.environmentId)}`);
  }

  const summary = [];
  const targetServices = new Map(currentPayload.services.map((service) => [service.key, service]));
  for (const sourceService of snapshot.services || []) {
    const targetService = targetServices.get(sourceService.key) || sourceService;
    await applyRailwayVariables({
      diff: args.diff,
      dryRun: args.dryRun,
      environment: railwayContext.environmentRef,
      projectDir,
      serviceName: targetService.serviceName,
      summary,
      variables: sourceService.variables || {},
    });
  }

  printRailwayImportSummary({
    dryRun: args.dryRun,
    file: path.resolve(process.cwd(), args.file),
    projectDir,
    railwayContext,
    summary,
  });
}

async function runDiffRailwayConfig(argv) {
  const args = parseDiffRailwayConfigArgs(argv);
  const left = args.file
    ? await readRailwayConfigSnapshot(args.file)
    : await buildResolvedRailwayConfigPayload({
        directory: args.directory,
        environment: args.environment,
        showSecrets: args.showSecrets,
      });
  const right = args.compareFile
    ? await readRailwayConfigSnapshot(args.compareFile)
    : await buildResolvedRailwayConfigPayload({
        directory: args.directory,
        environment: args.compareEnvironment,
        showSecrets: args.showSecrets,
      });

  const diff = sanitizeRailwayConfigSnapshotDiff(buildRailwayConfigSnapshotDiff(left, right), args.showSecrets);
  if (args.json) {
    console.log(JSON.stringify(diff, null, 2));
    return;
  }
  printRailwayConfigSnapshotDiff(diff);
}

async function buildResolvedRailwayConfigPayload(config) {
  const projectDir = path.resolve(process.cwd(), config.directory);
  const projectConfig = await loadProjectConfig(projectDir);
  const projectSlug = resolveProjectSlug(projectDir, projectConfig);
  const appServiceSpecs = resolveRailwayAppServiceSpecs(projectConfig);

  await ensureProjectStructure(projectDir);
  await ensureRailwayAppServiceTargets(projectDir, appServiceSpecs);

  const environmentSelection = resolveRailwayEnvironmentSelection(projectConfig, config.environment, null);
  const manifest = await readRailwayManifest(projectDir);
  manifest.projectSlug = manifest.projectSlug || projectSlug;
  manifest.appServices ||= {};
  manifest.resources ||= {};

  const plan = await resolveRailwayVariablePlan({
    appServiceSpecs,
    environmentSelection,
    includeUnresolvedServices: true,
    manifest,
    projectConfig,
    projectDir,
    railwayContext: { environmentRef: environmentSelection.railwayEnvironment || config.environment || null },
    services: [],
  });

  return {
    directory: projectDir,
    environment: {
      configKey: environmentSelection.configKey,
      railwayEnvironment: environmentSelection.railwayEnvironment || null,
    },
    exportedAt: new Date().toISOString(),
    services: appServiceSpecs.map((spec) => ({
      aliases: spec.aliases,
      baseName: spec.baseName,
      directory: spec.directory,
      dockerfile: spec.dockerfile,
      key: spec.key,
      serviceName: resolveRailwayServiceName(spec, projectSlug),
      variables: sanitizeVariablesForOutput(plan.serviceRegistry[spec.key]?.variables || {}, config.showSecrets),
    })),
    variablesMode: resolveRailwayVariablesMode(projectConfig),
  };
}

async function runDeployRailway(argv) {
  const args = parseDeployRailwayArgs(argv);
  const answers = await collectDeployRailwayAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);
  const projectConfig = await loadProjectConfig(projectDir);
  const projectSlug = resolveProjectSlug(projectDir, projectConfig);
  const appServiceSpecs = resolveRailwayAppServiceSpecs(projectConfig);
  const requestedRailwayEnvironment = resolveRequestedRailwayEnvironmentRef(projectConfig, answers.environment);

  await ensureProjectStructure(projectDir);
  await ensureRailwayAppServiceTargets(projectDir, appServiceSpecs);
  await ensureRailwayCliInstalled();
  await ensureRailwayAuthenticated(projectDir, requestedRailwayEnvironment);
  await ensureRailwayEnvironmentLinked(projectDir, requestedRailwayEnvironment);

  const manifest = await readRailwayManifest(projectDir);
  manifest.resources ||= {};
  manifest.appServices ||= {};

  const railwayContext = await loadRailwayContext(projectDir, requestedRailwayEnvironment);
  const environmentSelection = resolveRailwayEnvironmentSelection(projectConfig, answers.environment, railwayContext);
  railwayContext.environmentConfigKey = environmentSelection.configKey;
  railwayContext.environmentRef = environmentSelection.railwayEnvironment || railwayContext.environmentId || railwayContext.environmentName;
  const services = await discoverRailwayServices(railwayContext, projectDir);
  updateRailwayManifestAppServices(manifest, services, appServiceSpecs, projectSlug);

  const selectedSpecs = resolveDeployRailwaySpecs(answers.services, appServiceSpecs);
  const deploySummary = await deployRailwayAppServices({
    availableSpecs: appServiceSpecs,
    dryRun: answers.dryRun,
    manifest,
    messagePrefix: "asaje deploy-railway",
    projectDir,
    projectSlug,
    railwayContext,
    selectedSpecs,
    services,
  });

  manifest.environmentId = railwayContext.environmentId || manifest.environmentId || null;
  manifest.environmentName = railwayContext.environmentName || manifest.environmentName || null;
  manifest.projectId = railwayContext.projectId || manifest.projectId || null;
  manifest.projectName = railwayContext.projectName || manifest.projectName || null;
  manifest.projectSlug = manifest.projectSlug || projectSlug;
  manifest.updatedAt = new Date().toISOString();

  if (!answers.dryRun) {
    await writeRailwayManifest(projectDir, manifest);
  }

  printRailwayDeploySummary({
    deploySummary,
    dryRun: answers.dryRun,
    projectDir,
    railwayContext,
    selectedServices: selectedSpecs.map((spec) => spec.baseName),
  });
}

async function runDestroyRailway(argv) {
  const args = parseDestroyRailwayArgs(argv);
  const answers = await collectDestroyRailwayAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);

  await ensureProjectStructure(projectDir);
  await ensureRailwayCliInstalled();
  await ensureRailwayAuthenticated(projectDir, answers.environment);

  const railwayContext = await loadRailwayContext(projectDir, answers.environment);
  const targetEnvironment = answers.environment || railwayContext.environmentId || railwayContext.environmentName;
  const targetProject = railwayContext.projectId || railwayContext.projectName;

  if (answers.scope === "project") {
    if (!targetProject) {
      throw new Error(`Unable to determine Railway project for ${projectDir}. Link the directory first with \`railway link\`.`);
    }

    console.log(pc.bold("\nDestroy Railway project"));
    console.log(`- Project: ${pc.bold(railwayContext.projectName || railwayContext.projectId)}`);
    if (answers.dryRun) {
      console.log(`- Dry run: would delete project ${pc.bold(targetProject)}`);
      return;
    }

    const commandArgs = ["project", "delete", "--project", targetProject, "--yes"];
    if (answers.twoFactorCode) {
      commandArgs.push("--2fa-code", answers.twoFactorCode);
    }
    await runRailwayCommand(projectDir, undefined, commandArgs);
  } else {
    if (!targetEnvironment) {
      throw new Error(`Unable to determine Railway environment for ${projectDir}. Pass \`--environment\` or link the directory first.`);
    }

    await ensureRailwayEnvironmentLinked(projectDir, targetEnvironment);

    console.log(pc.bold("\nDestroy Railway environment"));
    console.log(`- Environment: ${pc.bold(targetEnvironment)}`);
    if (railwayContext.projectName || railwayContext.projectId) {
      console.log(`- Project: ${pc.bold(railwayContext.projectName || railwayContext.projectId)}`);
    }
    if (answers.dryRun) {
      console.log(`- Dry run: would delete environment ${pc.bold(targetEnvironment)}`);
      return;
    }

    const commandArgs = ["environment", "delete", targetEnvironment, "--yes"];
    if (answers.twoFactorCode) {
      commandArgs.push("--2fa-code", answers.twoFactorCode);
    }
    await runRailwayCommand(projectDir, undefined, commandArgs);
  }

  const manifestPath = path.join(projectDir, RAILWAY_MANIFEST_FILENAME);
  if (await fs.pathExists(manifestPath)) {
    await fs.remove(manifestPath);
    console.log(`- Removed local ${pc.bold(RAILWAY_MANIFEST_FILENAME)} manifest`);
  }
}

function parsePrintRailwayConfigArgs(argv) {
  const options = {
    directory: ".",
    environment: undefined,
    json: false,
    showSecrets: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--show-secrets") {
      options.showSecrets = true;
      continue;
    }

    if (arg === "--environment" || arg === "-e") {
      options.environment = argv[index + 1] || options.environment;
      index += 1;
      continue;
    }

    if (arg.startsWith("--environment=")) {
      options.environment = arg.split("=")[1] || options.environment;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  return options;
}

function parseExportRailwayConfigArgs(argv) {
  const options = {
    directory: ".",
    environment: undefined,
    output: undefined,
    showSecrets: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--show-secrets") {
      options.showSecrets = true;
      continue;
    }

    if (arg === "--environment" || arg === "-e") {
      options.environment = argv[index + 1] || options.environment;
      index += 1;
      continue;
    }

    if (arg.startsWith("--environment=")) {
      options.environment = arg.split("=")[1] || options.environment;
      continue;
    }

    if (arg === "--output" || arg === "-o") {
      options.output = argv[index + 1] || options.output;
      index += 1;
      continue;
    }

    if (arg.startsWith("--output=")) {
      options.output = arg.split("=")[1] || options.output;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  return options;
}

function parseImportRailwayConfigArgs(argv) {
  const options = {
    diff: false,
    directory: ".",
    dryRun: false,
    environment: undefined,
    file: undefined,
    yes: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--diff") {
      options.diff = true;
      continue;
    }

    if (arg === "--environment" || arg === "-e") {
      options.environment = argv[index + 1] || options.environment;
      index += 1;
      continue;
    }

    if (arg.startsWith("--environment=")) {
      options.environment = arg.split("=")[1] || options.environment;
      continue;
    }

    if (arg === "--file" || arg === "-f") {
      options.file = argv[index + 1] || options.file;
      index += 1;
      continue;
    }

    if (arg.startsWith("--file=")) {
      options.file = arg.split("=")[1] || options.file;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  if (!options.file) {
    throw new Error("import-railway-config requires --file <snapshot.json>.");
  }
  return options;
}

function parseSyncProjectConfigArgs(argv) {
  const options = {
    directory: ".",
    dryRun: false,
    yes: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  return options;
}

function parseSyncGithubWorkflowArgs(argv) {
  const options = {
    directory: ".",
    dryRun: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  return options;
}

function parseSyncReadmeArgs(argv) {
  const options = {
    directory: ".",
    dryRun: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  return options;
}

function parseDiffRailwayConfigArgs(argv) {
  const options = {
    compareEnvironment: undefined,
    compareFile: undefined,
    directory: ".",
    environment: undefined,
    file: undefined,
    json: false,
    showSecrets: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--show-secrets") {
      options.showSecrets = true;
      continue;
    }

    if (arg === "--environment" || arg === "-e") {
      options.environment = argv[index + 1] || options.environment;
      index += 1;
      continue;
    }

    if (arg.startsWith("--environment=")) {
      options.environment = arg.split("=")[1] || options.environment;
      continue;
    }

    if (arg === "--compare-environment") {
      options.compareEnvironment = argv[index + 1] || options.compareEnvironment;
      index += 1;
      continue;
    }

    if (arg.startsWith("--compare-environment=")) {
      options.compareEnvironment = arg.split("=")[1] || options.compareEnvironment;
      continue;
    }

    if (arg === "--file" || arg === "-f") {
      options.file = argv[index + 1] || options.file;
      index += 1;
      continue;
    }

    if (arg.startsWith("--file=")) {
      options.file = arg.split("=")[1] || options.file;
      continue;
    }

    if (arg === "--compare-file") {
      options.compareFile = argv[index + 1] || options.compareFile;
      index += 1;
      continue;
    }

    if (arg.startsWith("--compare-file=")) {
      options.compareFile = arg.split("=")[1] || options.compareFile;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  if (!options.compareEnvironment && !options.compareFile) {
    throw new Error("diff-railway-config requires --compare-environment <name> or --compare-file <snapshot.json>.");
  }
  return options;
}

async function collectSetupRailwayAnswers(args) {
  const directory = args.directory;
  const bucketState = await resolveSetupRailwayBucketState(args, directory);

  if (args.yes) {
    return {
      bucket: bucketState.bucket,
      directory,
      diff: args.diff,
      dryRun: args.dryRun,
      environment: args.environment,
      services: args.services,
    };
  }

  const selectedDirectory = await prompt(
    text({
      defaultValue: directory,
      message: "Project directory to configure on Railway?",
      placeholder: ".",
      validate(value) {
        return value.trim().length === 0 ? "Project directory is required" : undefined;
      },
    }),
  );

  const selectedBucketState = await resolveSetupRailwayBucketState(args, selectedDirectory);
  let bucket = selectedBucketState.bucket;

  if (!args.bucketProvided && !selectedBucketState.hasStoredBucket) {
    bucket = await prompt(
      text({
        defaultValue: selectedBucketState.bucket,
        message: "Object storage bucket name?",
        placeholder: DEFAULT_RAILWAY_BUCKET,
        validate(value) {
          return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value)
            ? undefined
            : "Use 3-63 lowercase letters, numbers, dots, or hyphens";
        },
      }),
    );
  }

  let environment = args.environment;
  if (!environment) {
    environment = await prompt(
      text({
        defaultValue: "",
        message: "Railway environment name or ID? (leave empty for linked default)",
        placeholder: "production",
      }),
    );
  }

  return {
    bucket,
    directory: selectedDirectory,
    diff: args.diff,
    dryRun: args.dryRun,
    environment: environment?.trim() || undefined,
    services: args.services,
  };
}

async function resolveSetupRailwayBucketState(args, directory) {
  if (args.bucketProvided) {
    return {
      bucket: args.bucket,
      hasStoredBucket: true,
    };
  }

  const projectDir = path.resolve(process.cwd(), directory || ".");
  const manifest = await readRailwayManifest(projectDir);
  const existingBucket = typeof manifest.bucket === "string" ? manifest.bucket.trim() : "";
  return {
    bucket: existingBucket || DEFAULT_RAILWAY_BUCKET,
    hasStoredBucket: Boolean(existingBucket),
  };
}

async function collectDeployRailwayAnswers(args) {
  if (args.yes) {
    return {
      directory: args.directory,
      dryRun: args.dryRun,
      environment: args.environment,
      services: args.services,
    };
  }

  const directory = await prompt(
    text({
      defaultValue: args.directory,
      message: "Project directory to deploy to Railway?",
      placeholder: ".",
      validate(value) {
        return value.trim().length === 0 ? "Project directory is required" : undefined;
      },
    }),
  );

  let environment = args.environment;
  if (!environment) {
    environment = await prompt(
      text({
        defaultValue: "",
        message: "Railway environment name or ID? (leave empty for linked default)",
        placeholder: "production",
      }),
    );
  }

  return {
    directory,
    dryRun: args.dryRun,
    environment: environment?.trim() || undefined,
    services: args.services,
  };
}

async function collectImportRailwayConfigAnswers(args) {
  if (args.yes || args.dryRun) {
    return args;
  }

  const confirmed = await prompt(
    confirm({
      initialValue: false,
      message: `Import Railway variables from ${args.file} into ${args.directory}?`,
    }),
  );

  if (!confirmed) {
    throw new Error("Railway config import cancelled.");
  }

  return args;
}

async function collectSyncProjectConfigAnswers(args) {
  if (args.yes || args.dryRun) {
    return args;
  }

  const confirmed = await prompt(
    confirm({
      initialValue: true,
      message: `Scan ${args.directory} and rewrite asaje.config.json / ${RAILWAY_MANIFEST_FILENAME}?`,
    }),
  );

  if (!confirmed) {
    throw new Error("Project config sync cancelled.");
  }

  return args;
}

async function collectDestroyRailwayAnswers(args) {
  if (args.yes) {
    return args;
  }

  const directory = await prompt(
    text({
      defaultValue: args.directory,
      message: "Project directory linked to Railway?",
      placeholder: ".",
      validate(value) {
        return value.trim().length === 0 ? "Project directory is required" : undefined;
      },
    }),
  );

  const scope = await prompt(
    select({
      initialValue: args.scope,
      message: "What should be deleted?",
      options: [
        { label: "Environment", value: "environment", hint: "Delete one Railway environment and its services/resources" },
        { label: "Project", value: "project", hint: "Delete the whole Railway project" },
      ],
    }),
  );

  let environment = args.environment;
  if (scope === "environment" && !environment) {
    environment = await prompt(
      text({
        defaultValue: "",
        message: "Railway environment name or ID? (leave empty for linked default)",
        placeholder: "production",
      }),
    );
  }

  const confirmed = await prompt(
    confirm({
      initialValue: false,
      message:
        scope === "project"
          ? "Delete the whole Railway project and all its environments?"
          : `Delete the Railway environment${environment ? ` ${environment}` : ""} and all its services/resources?`,
    }),
  );

  if (!confirmed) {
    throw new Error("Railway teardown cancelled.");
  }

  return {
    directory,
    dryRun: args.dryRun,
    environment: environment?.trim() || undefined,
    scope,
    twoFactorCode: args.twoFactorCode,
    yes: true,
  };
}

async function ensureRailwayCliInstalled() {
  const result = await checkCommand({ command: "railway", args: ["--version"], name: "railway" });
  if (!result.ok) {
    throw new Error(
      "Railway CLI is required for this command. Install it with `brew install railway` or `npm i -g @railway/cli`.",
    );
  }
}

async function ensureRailwayAuthenticated(projectDir, environment) {
  const result = await execa("railway", buildRailwayArgs(["whoami"], environment), {
    cwd: projectDir,
    reject: false,
  });

  if (result.exitCode !== 0) {
    throw new Error("Railway CLI is not authenticated. Run `railway login` and try again.");
  }
}

async function ensureRailwayEnvironmentLinked(projectDir, environment) {
  if (!environment) {
    return;
  }

  const result = await execa("railway", ["environment", "link", environment], {
    cwd: projectDir,
    reject: false,
  });

  if (result.exitCode !== 0) {
    throw new Error(`Unable to link Railway environment ${environment}. Make sure it exists and try again.`);
  }
}

async function readRailwayManifest(projectDir) {
  return readRailwayManifestFile(projectDir, {
    defaultBucket: DEFAULT_RAILWAY_BUCKET,
    filename: RAILWAY_MANIFEST_FILENAME,
  });
}

async function writeRailwayManifest(projectDir, manifest) {
  await writeRailwayManifestFile(projectDir, manifest, {
    filename: RAILWAY_MANIFEST_FILENAME,
  });
}

async function loadRailwayContext(projectDir, environment) {
  const result = await execa("railway", buildRailwayArgs(["status", "--json"], environment), {
    cwd: projectDir,
    reject: false,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `Unable to read Railway project status for ${projectDir}. Link the directory first with \`railway link\` or \`railway init\`.`,
    );
  }

  const payload = parseJsonOutput(result.stdout);
  if (!payload) {
    throw new Error("Railway status returned an unexpected response. Make sure the project is linked and try again.");
  }

  const project = payload.project || payload.linkedProject || payload.workspace?.project || null;
  const environmentData = payload.environment || payload.linkedEnvironment || payload.deployment?.environment || null;

  return {
    environmentId: pickFirstString([
      environmentData?.id,
      payload.environmentId,
      findFirstNestedValue(payload, "environmentId"),
    ]),
    environmentName: pickFirstString([
      environmentData?.name,
      payload.environmentName,
      environment,
      findFirstNestedValue(payload, "environmentName"),
    ]),
    projectId: pickFirstString([project?.id, payload.projectId, findFirstNestedValue(payload, "projectId")]),
    projectName: pickFirstString([
      project?.name,
      payload.projectName,
      findFirstNestedValue(payload, "projectName"),
    ]),
  };
}

async function discoverRailwayServices(railwayContext, projectDir) {
  const cliServices = await discoverRailwayServicesViaCli(railwayContext, projectDir);
  if (cliServices.length > 0) {
    return cliServices;
  }

  if (!railwayContext.projectId) {
    return [];
  }

  return fetchRailwayProjectServices(railwayContext.projectId);
}

async function discoverRailwayServicesViaCli(railwayContext, projectDir) {
  try {
    const result = await execa(
      "railway",
      buildRailwayArgs(["service", "status", "--all", "--json"], railwayContext.environmentRef),
      {
        cwd: projectDir,
        reject: false,
      },
    );

    if (result.exitCode !== 0) {
      return [];
    }

    const payload = parseJsonOutput(result.stdout);
    if (!payload) {
      return [];
    }

    return normalizeRailwayServices(extractRailwayServiceCandidates(payload));
  } catch {
    return [];
  }
}

async function ensureRailwayResource(config) {
  const manifestEntry = config.manifest.resources?.[config.key];
  const existingService = findRailwayService(config.existingServices, config.aliases, manifestEntry?.serviceName);

  if (existingService) {
    config.manifest.resources[config.key] = {
      bucket: config.metadata?.bucket || manifestEntry?.bucket || null,
      detectedAt: new Date().toISOString(),
      serviceId: existingService.id || manifestEntry?.serviceId || null,
      serviceName: existingService.name || manifestEntry?.serviceName || null,
      source: "remote",
      status: "existing",
    };

    console.log(`- ${pc.cyan(config.key)} already present${existingService.name ? ` (${existingService.name})` : ""}`);
    return {
      key: config.key,
      serviceName: existingService.name || manifestEntry?.serviceName || null,
      status: "existing",
    };
  }

  if (manifestEntry?.status === "created" || manifestEntry?.status === "existing") {
    console.log(`- ${pc.yellow(config.key)} tracked in ${RAILWAY_MANIFEST_FILENAME} but not found remotely, recreating...`);
  }

  console.log(`- creating ${pc.cyan(config.key)}...`);
  const servicesBefore = normalizeRailwayServices(config.existingServices);
  if (!config.dryRun) {
    await runRailwayCommand(config.projectDir, config.railwayContext.environmentRef, config.commandArgs);
  }

  let createdService = null;
  if (!config.dryRun) {
    createdService = await waitForCreatedRailwayService({
      aliases: config.aliases,
      beforeServices: servicesBefore,
      key: config.key,
      manifestEntry,
      projectDir: config.projectDir,
      railwayContext: config.railwayContext,
    });
  }

  config.manifest.resources[config.key] = {
    bucket: config.metadata?.bucket || null,
    detectedAt: new Date().toISOString(),
    serviceId: createdService?.id || null,
    serviceName: createdService?.name || null,
    source: "cli",
    status: "created",
  };

  return {
    key: config.key,
    serviceName: createdService?.name || null,
    status: config.dryRun ? "dry-run" : "created",
  };
}

async function ensureRailwayAppService(config) {
  const manifestEntry = config.manifest.appServices?.[config.key];
  const existingService = findRailwayService(
    config.existingServices,
    config.aliases,
    manifestEntry?.serviceName || config.serviceName,
  );

  if (existingService) {
    config.manifest.appServices[config.key] = {
      serviceId: existingService.id || manifestEntry?.serviceId || null,
      serviceName: existingService.name || manifestEntry?.serviceName || config.serviceName,
    };

    console.log(`- ${pc.cyan(config.serviceName)} already present${existingService.name ? ` (${existingService.name})` : ""}`);
    return {
      key: config.serviceName,
      serviceName: existingService.name || config.serviceName,
      status: "existing",
    };
  }

  if (manifestEntry?.serviceName) {
    console.log(`- ${pc.yellow(config.serviceName)} tracked in ${RAILWAY_MANIFEST_FILENAME} but not found remotely, recreating...`);
  }

  console.log(`- creating ${pc.cyan(config.serviceName)} service...`);
  const servicesBefore = normalizeRailwayServices(config.existingServices);
  if (!config.dryRun) {
    await runRailwayCommand(config.projectDir, config.railwayContext.environmentRef, [
      "add",
      "--service",
      config.serviceName,
      "--image",
      config.seedImage || "alpine:3.22",
      "--variables",
      `ASAJE_BOOTSTRAP_SERVICE=${config.serviceName}`,
    ]);
  }

  let createdService = null;
  if (!config.dryRun) {
    createdService = await waitForCreatedRailwayService({
      aliases: config.aliases,
      beforeServices: servicesBefore,
      key: config.serviceName,
      manifestEntry,
      projectDir: config.projectDir,
      railwayContext: config.railwayContext,
    });
  }

  config.manifest.appServices[config.key] = {
    serviceId: createdService?.id || null,
    serviceName: createdService?.name || config.serviceName,
  };

  return {
    key: config.serviceName,
    serviceName: createdService?.name || config.serviceName,
    status: config.dryRun ? "dry-run" : "created",
  };
}

async function deployRailwayAppServices(config) {
  console.log(pc.bold("\nDeployments"));

  const summary = [];
  const selectedSpecs = config.selectedSpecs || config.availableSpecs || DEFAULT_RAILWAY_APP_SERVICE_SPECS;
  for (const spec of selectedSpecs) {
    const manifestEntry = config.manifest.appServices?.[spec.key];
    const defaultServiceName = resolveRailwayServiceName(spec, config.projectSlug);
    const service = findRailwayService(config.services, spec.aliases, manifestEntry?.serviceName || defaultServiceName);
    const targetServiceName = service?.name || manifestEntry?.serviceName || defaultServiceName;

    if (!service && !config.dryRun) {
      console.log(`- ${pc.yellow(defaultServiceName)} service not found, skipping deployment`);
      continue;
    }

    if (config.dryRun) {
      console.log(`- would deploy ${pc.cyan(targetServiceName)} from ${spec.directory}/`);
      summary.push({ directory: spec.directory, serviceName: targetServiceName, status: "dry-run" });
      continue;
    }

    console.log(`- deploying ${pc.cyan(targetServiceName)} from ${spec.directory}/...`);
    await runRailwayCommand(config.projectDir, config.railwayContext.environmentRef, [
      "up",
      spec.directory,
      "--service",
      targetServiceName,
      "--path-as-root",
      "--detach",
      "--message",
      `${config.messagePrefix || "asaje setup-railway"}: deploy ${targetServiceName}`,
    ]);
    summary.push({ directory: spec.directory, serviceName: targetServiceName, status: "deployed" });
  }

  return summary;
}

function resolveDeployRailwaySpecs(selectedServices, availableSpecs = DEFAULT_RAILWAY_APP_SERVICE_SPECS) {
  if (!selectedServices || selectedServices.length === 0) {
    return availableSpecs;
  }

  const specs = [];
  for (const selectedService of selectedServices) {
    const normalizedService = normalizeRailwayServiceName(selectedService);
    const spec = availableSpecs.find((candidate) => {
      const names = [candidate.key, candidate.baseName, ...candidate.aliases].map(normalizeRailwayServiceName);
      return names.includes(normalizedService);
    });

    if (!spec) {
      throw new Error(
        `Unknown Railway service \`${selectedService}\`. Use one of: ${availableSpecs.map((candidate) => candidate.baseName).join(", ")}.`,
      );
    }

    if (!specs.includes(spec)) {
      specs.push(spec);
    }
  }

  return specs;
}

function listRailwayEnvironmentEntries(projectConfig) {
  const environments = getRailwayConfig(projectConfig).environments;
  if (!environments || typeof environments !== "object" || Array.isArray(environments)) {
    return [];
  }

  return Object.entries(environments)
    .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
    .map(([key, value]) => ({
      config: value,
      key,
      railwayEnvironment: pickFirstString([value.railwayEnvironment, value.environment, value.railwayEnvironmentName]),
    }));
}

function resolveRequestedRailwayEnvironmentRef(projectConfig, requestedEnvironment) {
  const entries = listRailwayEnvironmentEntries(projectConfig);
  const requested = pickFirstString([requestedEnvironment]);
  if (requested) {
    const exact = entries.find(
      (entry) => entry.key === requested || entry.railwayEnvironment === requested,
    );
    return exact?.railwayEnvironment || requested;
  }

  const defaultEntry = entries.find((entry) => entry.key === "default");
  return defaultEntry?.railwayEnvironment || undefined;
}

function resolveRailwayEnvironmentSelection(projectConfig, requestedEnvironment, railwayContext) {
  const entries = listRailwayEnvironmentEntries(projectConfig);
  const candidates = [
    pickFirstString([requestedEnvironment]),
    pickFirstString([railwayContext?.environmentId]),
    pickFirstString([railwayContext?.environmentName]),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const match = entries.find((entry) => entry.key === candidate || entry.railwayEnvironment === candidate);
    if (match) {
      return {
        config: match.config,
        configKey: match.key,
        railwayEnvironment: match.railwayEnvironment || candidate,
      };
    }
  }

  const defaultEntry = entries.find((entry) => entry.key === "default");
  if (defaultEntry) {
    return {
      config: defaultEntry.config,
      configKey: defaultEntry.key,
      railwayEnvironment: defaultEntry.railwayEnvironment || pickFirstString([railwayContext?.environmentId, railwayContext?.environmentName]),
    };
  }

  return {
    config: {},
    configKey: null,
    railwayEnvironment: pickFirstString([requestedEnvironment, railwayContext?.environmentId, railwayContext?.environmentName]),
  };
}

function resolveRailwayVariablesMode(projectConfig) {
  const mode = String(getRailwayConfig(projectConfig).variablesMode || "preserve-remote").trim().toLowerCase();
  if (!mode) {
    return "preserve-remote";
  }
  if (mode === "merge") {
    return "sync-managed";
  }
  if (!["preserve-remote", "sync-managed", "replace"].includes(mode)) {
    throw new Error("railway.variablesMode must be one of: `preserve-remote`, `sync-managed`, `replace` (legacy `merge` maps to `sync-managed`).");
  }
  return mode;
}

function normalizeRailwayVariableMap(input, contextLabel) {
  if (!input) {
    return {};
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${contextLabel} must be an object mapping variable names to values.`);
  }

  const normalized = {};
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }
    if (["string", "number", "boolean"].includes(typeof value)) {
      normalized[normalizedKey] = String(value);
      continue;
    }
    throw new Error(`${contextLabel}.${normalizedKey} must be a string, number, or boolean.`);
  }

  return normalized;
}

function resolveDeclaredRailwayVariables(projectConfig, environmentSelection) {
  const railwayConfig = getRailwayConfig(projectConfig);
  const rootVariables = railwayConfig.variables && typeof railwayConfig.variables === "object" && !Array.isArray(railwayConfig.variables)
    ? railwayConfig.variables
    : {};
  const environmentVariables = environmentSelection?.config?.variables && typeof environmentSelection.config.variables === "object" && !Array.isArray(environmentSelection.config.variables)
    ? environmentSelection.config.variables
    : {};

  const rootShared = normalizeRailwayVariableMap(rootVariables.shared, "railway.variables.shared");
  const environmentShared = normalizeRailwayVariableMap(
    environmentVariables.shared,
    `railway.environments.${environmentSelection?.configKey || "<selected>"}.variables.shared`,
  );

  const rootServices = rootVariables.services && typeof rootVariables.services === "object" && !Array.isArray(rootVariables.services)
    ? rootVariables.services
    : {};
  const environmentServices = environmentVariables.services && typeof environmentVariables.services === "object" && !Array.isArray(environmentVariables.services)
    ? environmentVariables.services
    : {};

  const serviceKeys = [...new Set([...Object.keys(rootServices), ...Object.keys(environmentServices)])];
  const variablesByService = {};

  for (const serviceKey of serviceKeys) {
    variablesByService[serviceKey] = {
      ...normalizeRailwayVariableMap(rootServices[serviceKey], `railway.variables.services.${serviceKey}`),
      ...normalizeRailwayVariableMap(
        environmentServices[serviceKey],
        `railway.environments.${environmentSelection?.configKey || "<selected>"}.variables.services.${serviceKey}`,
      ),
    };
  }

  return {
    hasDeclaredVariables:
      Object.keys(rootShared).length > 0 ||
      Object.keys(environmentShared).length > 0 ||
      serviceKeys.length > 0,
    sharedVariables: {
      ...rootShared,
      ...environmentShared,
    },
    variablesByService,
  };
}

function validateDeclaredRailwayVariableTargets(declaredVariables, serviceRegistry) {
  const knownKeys = new Set(Object.keys(serviceRegistry));
  for (const serviceKey of Object.keys(declaredVariables.variablesByService)) {
    if (!knownKeys.has(serviceKey)) {
      throw new Error(
        `railway.variables.services.${serviceKey} does not match a known managed service. Add it to railway.services first.`,
      );
    }
  }
}

function mergeRailwayServiceVariables(registryEntry, variables) {
  if (!registryEntry || !registryEntry.name) {
    return;
  }

  registryEntry.variables = {
    ...(registryEntry.variables || {}),
    ...variables,
  };
}

async function hydrateRailwayServiceVariables(projectDir, environment, serviceRegistry) {
  await Promise.all(
    Object.values(serviceRegistry)
      .filter((entry) => entry?.name)
      .map(async (entry) => {
        entry.existingVariables = await loadRailwayServiceVariables(projectDir, environment, entry.name);
      }),
  );
}

async function resolveRailwayVariablePlan(config) {
  const localEnv = await loadRailwayLocalEnvDefaults(config.projectDir);
  const variablesMode = resolveRailwayVariablesMode(config.projectConfig);
  const builtInServiceKeys = new Set(["admin", "api", "realtime", "worker", "landing", "pwa"]);

  const infra = {
    objectStorage: findRailwayService(
      config.services,
      ["object-storage", "storage", "simple-s3", "minio"],
      config.manifest.resources.objectStorage?.serviceName,
    ),
    postgres: findRailwayService(
      config.services,
      ["postgres", "postgresql"],
      config.manifest.resources.postgres?.serviceName,
    ),
    rabbitmq: findRailwayService(
      config.services,
      ["rabbitmq"],
      config.manifest.resources.rabbitmq?.serviceName,
    ),
  };
  const appServices = {
    admin: findRailwayServiceByKey(config.services, config.appServiceSpecs, config.manifest, "admin"),
    api: findRailwayServiceByKey(config.services, config.appServiceSpecs, config.manifest, "api"),
    landing: findRailwayServiceByKey(config.services, config.appServiceSpecs, config.manifest, "landing"),
    pwa: findRailwayServiceByKey(config.services, config.appServiceSpecs, config.manifest, "pwa"),
    realtime: findRailwayServiceByKey(config.services, config.appServiceSpecs, config.manifest, "realtime"),
    worker: findRailwayServiceByKey(config.services, config.appServiceSpecs, config.manifest, "worker"),
  };

  const serviceRegistry = {
    admin: appServices.admin ? { name: appServices.admin.name, variables: {} } : null,
    api: appServices.api ? { name: appServices.api.name, variables: {} } : null,
    landing: appServices.landing ? { name: appServices.landing.name, variables: {} } : null,
    objectStorage: infra.objectStorage ? { name: infra.objectStorage.name, variables: {} } : null,
    postgres: infra.postgres ? { name: infra.postgres.name, variables: {} } : null,
    pwa: appServices.pwa ? { name: appServices.pwa.name, variables: {} } : null,
    rabbitmq: infra.rabbitmq ? { name: infra.rabbitmq.name, variables: {} } : null,
    realtime: appServices.realtime ? { name: appServices.realtime.name, variables: {} } : null,
    worker: appServices.worker ? { name: appServices.worker.name, variables: {} } : null,
  };

  for (const spec of config.appServiceSpecs) {
    const service = findRailwayServiceByKey(config.services, config.appServiceSpecs, config.manifest, spec.key);
    if (service?.name) {
      serviceRegistry[spec.key] = serviceRegistry[spec.key] || { name: service.name, variables: {} };
      continue;
    }

    if (config.includeUnresolvedServices) {
      serviceRegistry[spec.key] = serviceRegistry[spec.key] || {
        name: resolveRailwayServiceName(spec, config.manifest.projectSlug),
        variables: {},
      };
    }
  }

  const declaredVariables = resolveDeclaredRailwayVariables(config.projectConfig, config.environmentSelection);
  validateDeclaredRailwayVariableTargets(declaredVariables, serviceRegistry);

  if (variablesMode === "preserve-remote" || variablesMode === "sync-managed") {
    await hydrateRailwayServiceVariables(config.projectDir, config.railwayContext.environmentRef, serviceRegistry);
  }

  const notices = [];
  if (!appServices.api) {
    notices.push("api service not found, skipping API variable wiring");
  }
  if (!appServices.realtime) {
    notices.push("realtime-gateway service not found, skipping realtime variable wiring");
  }
  if (!appServices.admin) {
    notices.push("admin service not found, skipping admin variable wiring");
  }
  if (!appServices.worker) {
    notices.push("worker service not found, skipping worker variable wiring");
  }
  if (!appServices.landing) {
    notices.push("landing service not found, skipping landing variable wiring");
  }
  if (!appServices.pwa) {
    notices.push("pwa service not found, skipping pwa variable wiring");
  }
  if (!infra.postgres) {
    notices.push("postgres resource not found, DATABASE_URL wiring will be skipped");
  }
  if (!infra.rabbitmq) {
    notices.push("rabbitmq resource not found, RABBITMQ_URL wiring will be skipped");
  }
  if (!infra.objectStorage) {
    notices.push("object-storage resource not found, S3 variable wiring will be skipped");
  }

  if (variablesMode !== "replace" && appServices.api) {
    const existingApiVariables = await loadRailwayServiceVariables(
      config.projectDir,
      config.railwayContext.environmentRef,
      appServices.api.name,
    );
    const variables = {};
    const sharedSecrets = buildRailwaySharedSecrets(localEnv, existingApiVariables);
    Object.assign(variables, sharedSecrets.api);
    if (infra.postgres?.name) {
      variables.DATABASE_URL = railwayReference(infra.postgres.name, "DATABASE_URL");
    }
    if (infra.rabbitmq?.name) {
      variables.RABBITMQ_URL = buildRabbitMqUrlReference(infra.rabbitmq.name);
    }
    if (infra.objectStorage?.name) {
      Object.assign(variables, buildObjectStorageVariables(infra.objectStorage.name));
    }
    const browserOrigins = buildRailwayBrowserOrigins(appServices);
    if (browserOrigins) {
      variables.CORS_ALLOWED_ORIGINS = browserOrigins;
    }
    variables.PUBLIC_API_BASE_URL = `https://${railwayReference(appServices.api.name, "RAILWAY_PUBLIC_DOMAIN")}`;
    assignManagedRailwayServiceVariables(serviceRegistry.api, variables, variablesMode);
  }

  if (variablesMode !== "replace" && appServices.realtime) {
    const variables = {};
    Object.assign(variables, buildRealtimeDefaults(localEnv));
    if (infra.rabbitmq?.name) {
      variables.RABBITMQ_URL = buildRabbitMqUrlReference(infra.rabbitmq.name);
    }
    if (appServices.api?.name) {
      variables.JWT_SECRET = railwayReference(appServices.api.name, "JWT_SECRET");
    }
    const browserOrigins = buildRailwayBrowserOrigins(appServices);
    if (browserOrigins) {
      variables.CORS_ALLOWED_ORIGINS = browserOrigins;
    }
    assignManagedRailwayServiceVariables(serviceRegistry.realtime, variables, variablesMode);
  }

  if (variablesMode !== "replace" && appServices.admin) {
    const variables = {};
    Object.assign(variables, buildAdminDefaults(localEnv));
    if (appServices.api?.name) {
      variables.VITE_API_BASE_URL = `https://${railwayReference(appServices.api.name, "RAILWAY_PUBLIC_DOMAIN")}/api/v1`;
    }
    if (appServices.realtime?.name) {
      variables.VITE_REALTIME_BASE_URL = `https://${railwayReference(appServices.realtime.name, "RAILWAY_PUBLIC_DOMAIN")}`;
    }
    assignManagedRailwayServiceVariables(serviceRegistry.admin, variables, variablesMode);
  }

  if (variablesMode !== "replace" && appServices.worker) {
    const existingApiVariables = appServices.api?.name
      ? await loadRailwayServiceVariables(config.projectDir, config.railwayContext.environmentRef, appServices.api.name)
      : {};
    const variables = {};
    const sharedSecrets = buildRailwaySharedSecrets(localEnv, existingApiVariables);
    Object.assign(variables, sharedSecrets.api);
    variables.API_COMMAND = "worker";
    if (infra.postgres?.name) {
      variables.DATABASE_URL = railwayReference(infra.postgres.name, "DATABASE_URL");
    }
    if (infra.rabbitmq?.name) {
      variables.RABBITMQ_URL = buildRabbitMqUrlReference(infra.rabbitmq.name);
    }
    if (infra.objectStorage?.name) {
      Object.assign(variables, buildObjectStorageVariables(infra.objectStorage.name));
    }
    assignManagedRailwayServiceVariables(serviceRegistry.worker, variables, variablesMode);
  }

  if (variablesMode !== "replace" && appServices.landing) {
    const variables = {};
    Object.assign(variables, buildLandingDefaults(localEnv));
    if (appServices.api?.name) {
      variables.API_BASE_URL = `https://${railwayReference(appServices.api.name, "RAILWAY_PUBLIC_DOMAIN")}`;
    }
    if (appServices.pwa?.name) {
      variables.PWA_BASE_URL = `https://${railwayReference(appServices.pwa.name, "RAILWAY_PUBLIC_DOMAIN")}`;
    }
    assignManagedRailwayServiceVariables(serviceRegistry.landing, variables, variablesMode);
  }

  if (variablesMode !== "replace" && appServices.pwa) {
    const variables = {};
    Object.assign(variables, buildPwaDefaults(localEnv));
    if (appServices.api?.name) {
      variables.VITE_API_BASE_URL = `https://${railwayReference(appServices.api.name, "RAILWAY_PUBLIC_DOMAIN")}/api/v1`;
    }
    if (appServices.realtime?.name) {
      variables.VITE_REALTIME_BASE_URL = `https://${railwayReference(appServices.realtime.name, "RAILWAY_PUBLIC_DOMAIN")}`;
    }
    assignManagedRailwayServiceVariables(serviceRegistry.pwa, variables, variablesMode);
  }

  if (variablesMode !== "replace") {
    for (const spec of config.appServiceSpecs) {
      if (builtInServiceKeys.has(spec.key)) {
        continue;
      }

      const serviceDefaults = await loadServiceEnvDefaults(config.projectDir, spec.directory);
      assignManagedRailwayServiceVariables(serviceRegistry[spec.key], serviceDefaults, variablesMode);
    }
  }

  if (declaredVariables.hasDeclaredVariables) {
    if (Object.keys(declaredVariables.sharedVariables).length > 0) {
      for (const entry of Object.values(serviceRegistry)) {
        mergeRailwayServiceVariables(entry, declaredVariables.sharedVariables);
      }
    }

    for (const [serviceKey, serviceVariables] of Object.entries(declaredVariables.variablesByService)) {
      mergeRailwayServiceVariables(serviceRegistry[serviceKey], serviceVariables);
    }
  }

  return {
    appServices,
    infra,
    notices,
    serviceRegistry,
    variablesMode,
  };
}

async function wireRailwayVariables(config) {
  console.log(pc.bold("\nVariables"));
  const plan = await resolveRailwayVariablePlan(config);

  updateRailwayManifestAppServices(
    config.manifest,
    Object.values(plan.appServices).filter(Boolean),
    ["admin", "api", "realtime", "worker", "landing", "pwa"].map((key) => findRailwayAppServiceSpec(config.appServiceSpecs, key)).filter(Boolean),
    config.manifest.projectSlug,
  );

  for (const notice of plan.notices) {
    console.log(`- ${pc.yellow(notice)}`);
  }

  for (const [serviceKey, entry] of Object.entries(plan.serviceRegistry)) {
    if (!entry?.name) {
      continue;
    }

    await applyRailwayVariables({
      diff: config.diff,
      dryRun: config.dryRun,
      environment: config.railwayContext.environmentRef,
      projectDir: config.projectDir,
      serviceName: entry.name,
      summary: config.summary,
      variables: entry.variables || {},
    });
  }
}

async function loadRailwayLocalEnvDefaults(projectDir) {
  const [apiEnv, realtimeEnv, adminEnv, landingEnv, pwaEnv] = await Promise.all([
    loadServiceEnvDefaults(projectDir, "api"),
    loadServiceEnvDefaults(projectDir, "realtime-gateway"),
    loadServiceEnvDefaults(projectDir, "admin"),
    loadServiceEnvDefaults(projectDir, "landing"),
    loadServiceEnvDefaults(projectDir, "pwa"),
  ]);

  return {
    admin: adminEnv,
    api: apiEnv,
    landing: landingEnv,
    pwa: pwaEnv,
    realtime: realtimeEnv,
  };
}

async function loadServiceEnvDefaults(projectDir, serviceDir) {
  const [exampleEnv, localEnv] = await Promise.all([
    tryReadEnvFile(path.join(projectDir, serviceDir, ".env.example")),
    tryReadEnvFile(path.join(projectDir, serviceDir, ".env")),
  ]);

  return {
    ...exampleEnv,
    ...localEnv,
  };
}

function buildRailwaySharedSecrets(localEnv, existingVariables) {
  const jwtSecret =
    sanitizeSecret(localEnv.api.JWT_SECRET, "change-me") ||
    sanitizeSecret(existingVariables.JWT_SECRET, "${{ api.JWT_SECRET }}") ||
    randomSecret(32);
  const swaggerPassword =
    sanitizeSecret(localEnv.api.SWAGGER_PASSWORD, "change-me-too") ||
    sanitizeSecret(existingVariables.SWAGGER_PASSWORD, "${{ api.SWAGGER_PASSWORD }}") ||
    randomSecret(18);

  return {
    api: {
      ACCESS_TOKEN_TTL_MINUTES: localEnv.api.ACCESS_TOKEN_TTL_MINUTES || "60",
      BREVO_API_KEY: localEnv.api.BREVO_API_KEY || "",
      DEFAULT_LOCALE: localEnv.api.DEFAULT_LOCALE || "fr",
      FILE_MAX_SIZE_MB: localEnv.api.FILE_MAX_SIZE_MB || "25",
      FILE_SIGNED_URL_TTL_MINUTES: localEnv.api.FILE_SIGNED_URL_TTL_MINUTES || "15",
      JWT_SECRET: jwtSecret,
      LOGIN_OTP_TTL_MINUTES: localEnv.api.LOGIN_OTP_TTL_MINUTES || "10",
      MAIL_PROVIDER: localEnv.api.MAIL_PROVIDER || "mailchimp",
      MAILCHIMP_TRANSACTIONAL_API_KEY: localEnv.api.MAILCHIMP_TRANSACTIONAL_API_KEY || "dev-placeholder-key",
      MAIL_FROM_EMAIL: localEnv.api.MAIL_FROM_EMAIL || "no-reply@example.com",
      MAIL_FROM_NAME: localEnv.api.MAIL_FROM_NAME || "Boilerplate API",
      PASSWORD_RESET_OTP_TTL_MINUTES: localEnv.api.PASSWORD_RESET_OTP_TTL_MINUTES || "15",
      PUBLIC_API_BASE_URL: localEnv.api.PUBLIC_API_BASE_URL || "",
      RABBITMQ_REALTIME_EXCHANGE: localEnv.api.RABBITMQ_REALTIME_EXCHANGE || "boilerplate.realtime",
      RABBITMQ_TASKS_EXCHANGE: localEnv.api.RABBITMQ_TASKS_EXCHANGE || "boilerplate.tasks",
      SMTP_HOST: localEnv.api.SMTP_HOST || "",
      SMTP_PASSWORD: localEnv.api.SMTP_PASSWORD || "",
      SMTP_PORT: localEnv.api.SMTP_PORT || "587",
      SMTP_USERNAME: localEnv.api.SMTP_USERNAME || "",
      SMTP_USE_SSL: localEnv.api.SMTP_USE_SSL || "false",
      RABBITMQ_WORKER_CONSUMER_TAG: localEnv.api.RABBITMQ_WORKER_CONSUMER_TAG || "api-worker",
      RABBITMQ_WORKER_QUEUE: localEnv.api.RABBITMQ_WORKER_QUEUE || "api.worker.default",
      RATE_LIMIT_BURST: localEnv.api.RATE_LIMIT_BURST || "60",
      RATE_LIMIT_RPM: localEnv.api.RATE_LIMIT_RPM || "120",
      REFRESH_TOKEN_TTL_MINUTES: localEnv.api.REFRESH_TOKEN_TTL_MINUTES || "10080",
      SWAGGER_PASSWORD: swaggerPassword,
      SWAGGER_USERNAME: localEnv.api.SWAGGER_USERNAME || "swagger",
    },
  };
}

function buildRealtimeDefaults(localEnv) {
  return {
    RABBITMQ_REALTIME_EXCHANGE: localEnv.realtime.RABBITMQ_REALTIME_EXCHANGE || "boilerplate.realtime",
    REALTIME_HEARTBEAT_SECONDS: localEnv.realtime.REALTIME_HEARTBEAT_SECONDS || "25",
    REALTIME_INSTANCE_ID: localEnv.realtime.REALTIME_INSTANCE_ID || "realtime-gateway-railway",
    REALTIME_QUEUE_PREFIX: localEnv.realtime.REALTIME_QUEUE_PREFIX || "realtime-gateway",
    REALTIME_WRITE_TIMEOUT_SECONDS: localEnv.realtime.REALTIME_WRITE_TIMEOUT_SECONDS || "10",
  };
}

function buildAdminDefaults(localEnv) {
  return {
    VITE_API_TIMEOUT_MS: localEnv.admin.VITE_API_TIMEOUT_MS || "15000",
    VITE_APP_NAME: localEnv.admin.VITE_APP_NAME || "Admin Blueprint",
    VITE_REALTIME_DEFAULT_TRANSPORT: localEnv.admin.VITE_REALTIME_DEFAULT_TRANSPORT || "ws",
    VITE_REALTIME_RECONNECT_DELAY_MS: localEnv.admin.VITE_REALTIME_RECONNECT_DELAY_MS || "3000",
  };
}

function buildLandingDefaults(localEnv) {
  return {
    API_BASE_URL: localEnv.landing.API_BASE_URL || "",
    PWA_BASE_URL: localEnv.landing.PWA_BASE_URL || "",
  };
}

function buildPwaDefaults(localEnv) {
  return {
    VITE_API_BASE_URL: localEnv.pwa.VITE_API_BASE_URL || "",
    VITE_APP_NAME: localEnv.pwa.VITE_APP_NAME || "Asaje PWA",
    VITE_REALTIME_BASE_URL: localEnv.pwa.VITE_REALTIME_BASE_URL || "",
  };
}

function sanitizeSecret(value, placeholder) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === placeholder) {
    return "";
  }
  return normalized;
}

function buildObjectStorageVariables(serviceName) {
  return {
    MINIO_ACCESS_KEY: railwayReference(serviceName, "MINIO_ROOT_USER"),
    MINIO_BUCKET_NAME: railwayReference(serviceName, "MINIO_BUCKET"),
    MINIO_ENDPOINT: railwayReference(serviceName, "RAILWAY_PRIVATE_DOMAIN"),
    MINIO_PORT: "9000",
    MINIO_PUBLIC_URL: `https://${railwayReference(serviceName, "RAILWAY_PUBLIC_DOMAIN")}`,
    MINIO_SECRET_KEY: railwayReference(serviceName, "MINIO_ROOT_PASSWORD"),
    MINIO_USE_SSL: "false",
    OBJECT_STORAGE_PROVIDER: "minio",
  };
}

function buildRabbitMqUrlReference(serviceName) {
  return `amqp://${railwayReference(serviceName, "RABBITMQ_DEFAULT_USER")}:${railwayReference(serviceName, "RABBITMQ_DEFAULT_PASS")}@${railwayReference(serviceName, "RAILWAY_PRIVATE_DOMAIN")}:5672/`;
}

function railwayReference(serviceName, variableName) {
  return "${{ " + serviceName + "." + variableName + " }}";
}

async function applyRailwayVariables(config) {
  const entries = Object.entries(config.variables).filter(([, value]) => typeof value === "string" && value.length > 0);
  if (entries.length === 0) {
    console.log(`- ${pc.dim(config.serviceName)} no variables to set`);
    return;
  }

  const existingVariables = config.diff
    ? await loadRailwayServiceVariables(config.projectDir, config.environment, config.serviceName)
    : {};
  const variableDiff = config.diff ? buildRailwayVariableDiff(existingVariables, config.variables, { includeRemoved: false }) : null;

  if (config.diff && variableDiff) {
    printRailwayVariableDiff(config.serviceName, variableDiff);
  }

  if (config.dryRun) {
    console.log(`- ${pc.cyan(config.serviceName)} would set ${entries.map(([key]) => key).join(", ")}`);
    config.summary.push({
      diff: variableDiff,
      keys: entries.map(([key]) => key),
      serviceName: config.serviceName,
      status: "dry-run",
    });
    return;
  }

  await runRailwayCommand(config.projectDir, config.environment, [
    "variable",
    "set",
    ...entries.map(([key, value]) => `${key}=${value}`),
    "--service",
    config.serviceName,
  ]);
  console.log(`- ${pc.cyan(config.serviceName)} set ${entries.map(([key]) => key).join(", ")}`);
  config.summary.push({
    diff: variableDiff,
    keys: entries.map(([key]) => key),
    serviceName: config.serviceName,
    status: "updated",
  });
}

function printRailwayVariableDiff(serviceName, diff) {
  const counts = [`${diff.added.length} added`, `${diff.changed.length} changed`, `${diff.unchanged.length} unchanged`].join(", ");
  console.log(`- ${pc.cyan(serviceName)} diff: ${counts}`);

  for (const item of [...diff.added, ...diff.changed]) {
    const before = item.currentValue === undefined ? "<unset>" : formatRailwayVariableValue(item.key, item.currentValue);
    const after = formatRailwayVariableValue(item.key, item.nextValue);
    console.log(`  ${item.key}: ${before} -> ${after}`);
  }
}

function printResolvedRailwayConfig(payload) {
  console.log(pc.bold("\nRailway config"));
  console.log(`- Directory: ${pc.bold(payload.directory)}`);
  console.log(`- Variables mode: ${pc.bold(payload.variablesMode)}`);
  console.log(`- Environment key: ${pc.bold(payload.environment.configKey || "<none>")}`);
  console.log(`- Railway environment: ${pc.bold(payload.environment.railwayEnvironment || "<linked default>")}`);

  console.log(pc.bold("\nServices"));
  for (const service of payload.services) {
    console.log(`- ${pc.bold(service.key)} -> ${service.serviceName}`);
    console.log(`  directory: ${service.directory}`);
    if (service.dockerfile) {
      console.log(`  dockerfile: ${service.dockerfile}`);
    }
    console.log(`  aliases: ${service.aliases.join(", ")}`);
    const variableEntries = Object.entries(service.variables || {});
    if (variableEntries.length === 0) {
      console.log("  variables: <none>");
      continue;
    }
    console.log("  variables:");
    for (const [key, value] of variableEntries.sort(([left], [right]) => left.localeCompare(right))) {
      console.log(`    ${key}=${value}`);
    }
  }
}

function printRailwayConfigSnapshotDiff(diff) {
  console.log(pc.bold("\nRailway config diff"));
  console.log(`- Left: ${pc.bold(formatRailwayDiffSide(diff.left))}`);
  console.log(`- Right: ${pc.bold(formatRailwayDiffSide(diff.right))}`);

  console.log(pc.bold("\nServices"));
  for (const service of diff.services) {
    const summary = [`${service.variables.added.length} added vars`, `${service.variables.changed.length} changed vars`, `${service.variables.removed.length} removed vars`].join(", ");
    console.log(`- ${pc.bold(service.key)}: ${service.status}, ${summary}`);
    for (const [field, fieldDiff] of Object.entries(service.metadata)) {
      if (fieldDiff.status === "unchanged") {
        continue;
      }
      console.log(`  ${field}: ${fieldDiff.left ?? "<unset>"} -> ${fieldDiff.right ?? "<unset>"}`);
    }
    for (const item of [...service.variables.added, ...service.variables.changed, ...service.variables.removed]) {
      console.log(`  ${item.key}: ${item.currentValue ?? "<unset>"} -> ${item.nextValue ?? "<unset>"}`);
    }
  }
}

function formatRailwayDiffSide(side) {
  const env = side.environment?.configKey || side.environment?.railwayEnvironment || "default";
  return `${side.directory || "<snapshot>"} (${env})`;
}

function printRailwayImportSummary(config) {
  console.log(pc.bold("\nRailway import"));
  console.log(`- Source file: ${pc.bold(config.file)}`);
  console.log(`- Directory: ${pc.bold(config.projectDir)}`);
  if (config.railwayContext.environmentName || config.railwayContext.environmentId) {
    console.log(`- Environment: ${pc.bold(config.railwayContext.environmentName || config.railwayContext.environmentId)}`);
  }

  console.log(pc.bold("\nVariables"));
  if (config.summary.length === 0) {
    console.log("- No variables were applied");
  } else {
    for (const item of config.summary) {
      console.log(`- ${pc.bold(item.serviceName)}: ${item.status} ${item.keys.join(", ")}`);
    }
  }

  if (config.dryRun) {
    console.log("- Dry run only, Railway variables were not changed");
  }
}

async function loadRailwayServiceVariables(projectDir, environment, serviceName) {
  try {
    const result = await execa(
      "railway",
      buildRailwayArgs(["variable", "list", "--json", "--service", serviceName], environment),
      {
        cwd: projectDir,
        reject: false,
      },
    );

    if (result.exitCode !== 0) {
      return {};
    }

    return normalizeRailwayVariables(parseJsonOutput(result.stdout));
  } catch {
    return {};
  }
}

async function waitForCreatedRailwayService(config) {
  for (let attempt = 0; attempt < RAILWAY_SERVICE_DISCOVERY_RETRY_COUNT; attempt += 1) {
    const servicesAfter = await discoverRailwayServices(config.railwayContext, config.projectDir);
    const createdService = findCreatedRailwayService({
      aliases: config.aliases,
      beforeServices: config.beforeServices,
      manifestServiceName: config.manifestEntry?.serviceName,
      servicesAfter,
    });

    if (createdService) {
      return createdService;
    }

    if (attempt < RAILWAY_SERVICE_DISCOVERY_RETRY_COUNT - 1) {
      await sleep(RAILWAY_SERVICE_DISCOVERY_RETRY_DELAY_MS);
    }
  }

  throw new Error(
    `Railway command for ${config.key} finished but the new service was not detected afterwards. Check the Railway dashboard/logs, then rerun \`asaje setup-railway\` or \`asaje sync-railway-env\` once the service appears.`,
  );
}

function normalizeRailwayVariables(input) {
  const normalized = {};

  visitRailwayJson(input, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return;
    }

    const key = pickFirstString([value.name, value.key]);
    const rawValue = pickFirstString([value.value, value.resolvedValue]);
    if (!key || rawValue === null) {
      return;
    }

    normalized[key] = rawValue;
  });

  return normalized;
}

function extractRailwayServiceCandidates(input) {
  const candidates = [];

  visitRailwayJson(input, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return;
    }

    if (typeof value.name === "string" || typeof value.serviceName === "string") {
      candidates.push(value);
    }
  });

  return candidates;
}

function visitRailwayJson(input, visitor) {
  visitor(input);
  if (!input || typeof input !== "object") {
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      visitRailwayJson(item, visitor);
    }
    return;
  }

  for (const value of Object.values(input)) {
    visitRailwayJson(value, visitor);
  }
}

function sleep(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function runRailwayCommand(projectDir, environment, args) {
  const result = await execa("railway", buildRailwayArgs(args, environment), {
    cwd: projectDir,
    reject: false,
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`Railway command failed: railway ${args.join(" ")}`);
  }
}

function buildRailwayArgs(args, environment) {
  if (!environment) {
    return args;
  }

  const commandKey = args.slice(0, 2).join(" ");
  const supportsEnvironmentFlag =
    commandKey === "service status" ||
    commandKey === "variable list" ||
    commandKey === "variable set" ||
    args[0] === "up";

  if (!supportsEnvironmentFlag) {
    return args;
  }

  return [...args, "--environment", environment];
}

function parseJsonOutput(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function pickFirstString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function findFirstNestedValue(input, key) {
  if (!input || typeof input !== "object") {
    return null;
  }

  if (typeof input[key] === "string") {
    return input[key];
  }

  for (const value of Object.values(input)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const nested = findFirstNestedValue(value, key);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function printRailwaySetupSummary(config) {
  console.log(pc.bold("\nRailway"));
  console.log(`- Directory: ${pc.bold(config.projectDir)}`);
  if (config.railwayContext.projectName || config.railwayContext.projectId) {
    console.log(`- Project: ${pc.bold(config.railwayContext.projectName || config.railwayContext.projectId)}`);
  }
  if (config.railwayContext.environmentName || config.railwayContext.environmentId) {
    console.log(`- Environment: ${pc.bold(config.railwayContext.environmentName || config.railwayContext.environmentId)}`);
  }
  console.log(`- Managed services: ${pc.bold("api, worker, realtime-gateway, admin")}`);
  console.log(`- Bucket: ${pc.bold(config.bucket)}`);

  console.log(pc.bold("\nResources"));
  if (config.resourceSummary.length === 0) {
    console.log("- No infrastructure resources were changed");
  } else {
    for (const item of config.resourceSummary) {
      const detail = item.serviceName ? ` (${item.serviceName})` : "";
      console.log(`- ${pc.bold(item.key)}: ${item.status}${detail}`);
    }
  }

  console.log(pc.bold("\nApplication services"));
  if (config.appServiceSummary.length === 0) {
    console.log("- No application services were changed");
  } else {
    for (const item of config.appServiceSummary) {
      const detail = item.serviceName ? ` (${item.serviceName})` : "";
      console.log(`- ${pc.bold(item.key)}: ${item.status}${detail}`);
    }
  }

  console.log(pc.bold("\nDeployments"));
  if (config.deploySummary.length === 0) {
    console.log("- No application deployments were triggered");
  } else {
    for (const item of config.deploySummary) {
      console.log(`- ${pc.bold(item.serviceName)}: ${item.status} from ${item.directory}/`);
    }
  }

  console.log(pc.bold("\nVariables"));
  if (config.variableSummary.length === 0) {
    console.log("- No application variables were updated");
  } else {
    for (const item of config.variableSummary) {
      console.log(`- ${pc.bold(item.serviceName)}: ${item.status} ${item.keys.join(", ")}`);
    }
  }

  if (config.dryRun) {
    console.log(`- Dry run only, ${pc.bold(RAILWAY_MANIFEST_FILENAME)} was not written`);
  } else {
    console.log(`- Manifest written to ${pc.bold(RAILWAY_MANIFEST_FILENAME)} for future runs`);
  }

  if (!getRailwayApiAuth()) {
    console.log(pc.yellow("\nNote: Set RAILWAY_API_TOKEN or RAILWAY_TOKEN to let future runs verify remote services before provisioning."));
  }
}

function printRailwayDeploySummary(config) {
  console.log(pc.bold("\nRailway deploy"));
  console.log(`- Directory: ${pc.bold(config.projectDir)}`);
  if (config.railwayContext.projectName || config.railwayContext.projectId) {
    console.log(`- Project: ${pc.bold(config.railwayContext.projectName || config.railwayContext.projectId)}`);
  }
  if (config.railwayContext.environmentName || config.railwayContext.environmentId) {
    console.log(`- Environment: ${pc.bold(config.railwayContext.environmentName || config.railwayContext.environmentId)}`);
  }
  console.log(`- Default managed services: ${pc.bold("api, worker, realtime-gateway, admin")}`);
  console.log(`- Services: ${pc.bold(config.selectedServices.join(", "))}`);

  console.log(pc.bold("\nDeployments"));
  if (config.deploySummary.length === 0) {
    console.log("- No application deployments were triggered");
  } else {
    for (const item of config.deploySummary) {
      console.log(`- ${pc.bold(item.serviceName)}: ${item.status} from ${item.directory}/`);
    }
  }

  if (config.dryRun) {
    console.log(`- Dry run only, ${pc.bold(RAILWAY_MANIFEST_FILENAME)} was not written`);
  } else {
    console.log(`- Manifest written to ${pc.bold(RAILWAY_MANIFEST_FILENAME)} for future runs`);
  }
}

async function ensureRailwayAppServiceTargets(projectDir, appServiceSpecs) {
  for (const spec of appServiceSpecs) {
    const serviceDir = path.join(projectDir, spec.directory);
    if (!(await fs.pathExists(serviceDir))) {
      throw new Error(`Railway service \`${spec.key}\` points to a missing directory: ${spec.directory}`);
    }

    if (spec.dockerfile) {
      const dockerfilePath = path.join(projectDir, spec.dockerfile);
      if (!(await fs.pathExists(dockerfilePath))) {
        throw new Error(`Railway service \`${spec.key}\` points to a missing Dockerfile: ${spec.dockerfile}`);
      }
    }
  }
}

async function writeProjectConfigFile(projectDir, projectConfig) {
  const configPath = path.join(projectDir, "asaje.config.json");
  await fs.writeJson(configPath, projectConfig, { spaces: 2 });
}

function printSyncProjectConfigSummary(config) {
  const previousServices = new Map(resolveRailwayAppServiceSpecs(config.previousProjectConfig).map((service) => [service.key, service]));
  const nextServices = config.nextProjectConfig.railway?.services || [];

  console.log(pc.bold("\nProject config sync"));
  console.log(`- Directory: ${pc.bold(config.projectDir)}`);
  console.log(`- Dockerfiles found: ${pc.bold(String(config.scanSummary.dockerfiles.length))}`);

  console.log(pc.bold("\nRailway services"));
  if (nextServices.length === 0) {
    console.log("- No managed Railway services detected");
  } else {
    for (const service of nextServices) {
      const previous = previousServices.get(service.key);
      const status = !previous ? "new" : previous.directory !== service.directory || previous.dockerfile !== service.dockerfile ? "updated" : "unchanged";
      console.log(`- ${pc.bold(service.key)}: ${status} (${service.directory})`);
    }
  }

  console.log(pc.bold("\nFiles"));
  console.log(`- ${config.dryRun ? "would write" : "wrote"} ${pc.bold("asaje.config.json")}`);
  console.log(`- ${config.dryRun ? "would write" : "wrote"} ${pc.bold(RAILWAY_MANIFEST_FILENAME)}`);
  if (config.dryRun) {
    console.log("- Dry run only, local files were not modified");
  }
}

async function updateProjectTemplateConfig(projectDir, projectConfig, templateRepository, templateBranch) {
  const configPath = path.join(projectDir, "asaje.config.json");
  const nextConfig = {
    ...(projectConfig || {}),
    template: {
      branch: templateBranch,
      repository: templateRepository,
    },
  };

  await fs.writeJson(configPath, nextConfig, { spaces: 2 });
}

async function applyTemplateUpdates(config) {
  const summary = {
    missing: [],
    skipped: [],
    updated: [],
  };

  for (const relativePath of config.selectedPaths) {
    const sourcePath = path.join(config.templateDir, relativePath);
    const destinationPath = path.join(config.projectDir, relativePath);

    if (!(await fs.pathExists(sourcePath))) {
      summary.missing.push(relativePath);
      continue;
    }

    const sourceStats = await fs.stat(sourcePath);
    if (config.dryRun) {
      summary.updated.push(relativePath);
      continue;
    }

    if (sourceStats.isDirectory()) {
      await fs.remove(destinationPath);
      await fs.copy(sourcePath, destinationPath);
    } else {
      await fs.ensureDir(path.dirname(destinationPath));
      await fs.copyFile(sourcePath, destinationPath);
    }

    summary.updated.push(relativePath);
  }

  summary.skipped = config.selectedPaths.filter((relativePath) => !summary.updated.includes(relativePath) && !summary.missing.includes(relativePath));
  return summary;
}

function printUpdateSummary(config) {
  console.log(pc.bold("\nUpdate"));
  console.log(`- Directory: ${pc.bold(config.projectDir)}`);
  console.log(`- Template: ${pc.bold(`${config.repository}#${config.branch}`)}`);
  console.log(`- Safe paths: ${pc.bold(String(SAFE_UPDATE_PATHS.length))}`);
  if (config.include.length > 0) {
    console.log(`- Extra include: ${pc.bold(config.include.join(", "))}`);
  }

  console.log(pc.bold("\nUpdated"));
  if (config.summary.updated.length === 0) {
    console.log("- No files selected for update");
  } else {
    for (const relativePath of config.summary.updated) {
      console.log(`- ${config.dryRun ? "would update" : "updated"} ${pc.bold(relativePath)}`);
    }
  }

  if (config.summary.missing.length > 0) {
    console.log(pc.bold("\nMissing In Template"));
    for (const relativePath of config.summary.missing) {
      console.log(`- ${pc.bold(relativePath)}`);
    }
  }

  if (config.dryRun) {
    console.log("- Dry run only, local files were not modified");
  }
}

function printStartSummary(projectDir, runtimeConfig, profile, selectedServices) {
  console.log(pc.green("\nStarting project services."));
  console.log(`- Directory: ${pc.bold(projectDir)}`);
  console.log(`- Profile: ${pc.bold(profile)}`);
  console.log(`- Services: ${pc.bold(selectedServices.join(", "))}`);
  console.log(`- Admin URL: ${pc.bold(`http://localhost:${runtimeConfig.ports.admin}`)}`);
  console.log(`- Landing URL: ${pc.bold(`http://localhost:${runtimeConfig.ports.landing}`)}`);
  console.log(`- API URL: ${pc.bold(`http://localhost:${runtimeConfig.ports.api}/api/v1`)}`);
  console.log(`- PWA URL: ${pc.bold(`http://localhost:${runtimeConfig.ports.pwa}`)}`);
  console.log(`- Realtime URL: ${pc.bold(`http://localhost:${runtimeConfig.ports.realtime}`)}`);
  console.log(pc.dim("\nPress Ctrl+C to stop all managed services."));
}

async function startManagedProcesses(projectDir, runtimeConfig, selectedServices) {
  const specs = [];

  if (selectedServices.includes("api")) {
    specs.push({
      args: ["run", ".", "serve"],
      color: pc.blue,
      command: "go",
      cwd: path.join(projectDir, "api"),
      name: "api",
    });
  }

  if (selectedServices.includes("worker")) {
    specs.push({
      args: ["run", ".", "worker"],
      color: pc.magenta,
      command: "go",
      cwd: path.join(projectDir, "api"),
      name: "worker",
    });
  }

  if (selectedServices.includes("realtime")) {
    specs.push({
      args: ["run", "."],
      color: pc.yellow,
      command: "go",
      cwd: path.join(projectDir, "realtime-gateway"),
      name: "realtime",
    });
  }

  if (selectedServices.includes("admin")) {
    specs.push({
      args: ["dev", "--host", "0.0.0.0", "--port", String(runtimeConfig.ports.admin)],
      color: pc.green,
      command: "pnpm",
      cwd: path.join(projectDir, "admin"),
      name: "admin",
    });
  }

  if (selectedServices.includes("landing") && await fs.pathExists(path.join(projectDir, "landing/package.json"))) {
    specs.push({
      args: ["dev", "--host", "0.0.0.0", "--port", String(runtimeConfig.ports.landing)],
      color: pc.cyan,
      command: "pnpm",
      cwd: path.join(projectDir, "landing"),
      name: "landing",
    });
  }

  if (selectedServices.includes("pwa") && await fs.pathExists(path.join(projectDir, "pwa/package.json"))) {
    specs.push({
      args: ["dev", "--host", "0.0.0.0", "--port", String(runtimeConfig.ports.pwa)],
      color: pc.white,
      command: "pnpm",
      cwd: path.join(projectDir, "pwa"),
      name: "pwa",
    });
  }

  const children = specs.map((spec) => createManagedProcess(spec));
  const stopAll = () => {
    for (const child of children) {
      child.kill("SIGTERM");
    }
  };

  const onSignal = (signal) => {
    console.log(pc.dim(`\nReceived ${signal}, stopping services...`));
    stopAll();
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  try {
    await Promise.race(
      children.map((child) =>
        child.then(
          (result) => {
            if (result.exitCode !== 0 && result.exitCode !== null) {
              throw new Error(`${result.name} exited with code ${result.exitCode}`);
            }
            throw new Error(`${result.name} stopped`);
          },
        ),
      ),
    );
  } catch (error) {
    stopAll();
    if (error instanceof Error && error.message.endsWith("stopped")) {
      return;
    }
    throw error;
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}
