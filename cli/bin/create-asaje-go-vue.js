#!/usr/bin/env node

import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  password,
  select,
  text,
} from "@clack/prompts";
import degit from "degit";
import { execa } from "execa";
import fs from "fs-extra";
import pc from "picocolors";

const DEFAULT_TEMPLATE = process.env.ASAJE_TEMPLATE_REPO || "asaje379/boilerplate-go-vue";
const DEFAULT_BRANCH = process.env.ASAJE_TEMPLATE_BRANCH || "main";
const EXCLUDED_TEMPLATE_PATHS = ["cli"];
const RAILWAY_GRAPHQL_ENDPOINT = "https://backboard.railway.com/graphql/v2";
const RAILWAY_MANIFEST_FILENAME = "asaje.railway.json";
const DEFAULT_RAILWAY_BUCKET = "boilerplate-files";
const RAILWAY_SERVICE_DISCOVERY_RETRY_DELAY_MS = 2000;
const RAILWAY_SERVICE_DISCOVERY_RETRY_COUNT = 5;
const RAILWAY_APP_SERVICE_SPECS = [
  {
    aliases: ["api", "backend", "server"],
    baseName: "api",
    directory: "api",
    key: "api",
  },
  {
    aliases: ["admin", "frontend", "web"],
    baseName: "admin",
    directory: "admin",
    key: "admin",
  },
  {
    aliases: ["realtime-gateway", "realtime"],
    baseName: "realtime-gateway",
    directory: "realtime-gateway",
    key: "realtime",
  },
];
const SAFE_UPDATE_PATHS = [
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
];
const ENV_FILE_SPECS = [
  { envPath: "admin/.env", examplePath: "admin/.env.example" },
  { envPath: "api/.env", examplePath: "api/.env.example" },
  { envPath: "realtime-gateway/.env", examplePath: "realtime-gateway/.env.example" },
];

await main();

async function main() {
  const invocation = resolveInvocation(process.argv);
  intro(pc.cyan(invocation.title));

  try {
    if (invocation.command === "help") {
      printHelp();
      outro(pc.green("Ready."));
      return;
    }

    if (invocation.command === "start") {
      await runStart(invocation.argv);
      outro(pc.green("Services stopped."));
      return;
    }

    if (invocation.command === "doctor") {
      await runDoctor(invocation.argv);
      outro(pc.green("Doctor finished."));
      return;
    }

    if (invocation.command === "publish") {
      await runPublish(invocation.argv);
      outro(pc.green("Publish checklist complete."));
      return;
    }

    if (invocation.command === "update") {
      await runUpdate(invocation.argv);
      outro(pc.green("Project update complete."));
      return;
    }

    if (invocation.command === "setup-railway") {
      await runSetupRailway(invocation.argv);
      outro(pc.green("Railway setup complete."));
      return;
    }

    if (invocation.command === "sync-railway-env") {
      await runSyncRailwayEnv(invocation.argv);
      outro(pc.green("Railway environment sync complete."));
      return;
    }

    if (invocation.command === "destroy-railway") {
      await runDestroyRailway(invocation.argv);
      outro(pc.green("Railway teardown complete."));
      return;
    }

    await runCreate(invocation.argv);
    outro(pc.green("Project ready."));
  } catch (error) {
    if (error instanceof Error) {
      cancel(error.message);
      process.exit(1);
    }

    cancel("Unknown error");
    process.exit(1);
  }
}

function resolveInvocation(argv) {
  const binName = path.basename(argv[1] || "create-asaje-go-vue");
  const normalizedBinName = binName.replace(/\.js$/, "");
  const rawArgs = argv.slice(2);
  const firstArg = rawArgs[0];

  if (["help", "--help", "-h"].includes(firstArg || "")) {
    return { argv: rawArgs.slice(1), command: "help", title: normalizedBinName };
  }

  if (normalizedBinName === "asaje") {
    if (!firstArg) {
      return { argv: [], command: "help", title: "asaje" };
    }

    if (firstArg === "start") {
      return { argv: rawArgs.slice(1), command: "start", title: "asaje start" };
    }

    if (firstArg === "doctor") {
      return { argv: rawArgs.slice(1), command: "doctor", title: "asaje doctor" };
    }

    if (firstArg === "publish") {
      return { argv: rawArgs.slice(1), command: "publish", title: "asaje publish" };
    }

    if (firstArg === "update") {
      return { argv: rawArgs.slice(1), command: "update", title: "asaje update" };
    }

    if (firstArg === "setup-railway") {
      return { argv: rawArgs.slice(1), command: "setup-railway", title: "asaje setup-railway" };
    }

    if (firstArg === "sync-railway-env") {
      return { argv: rawArgs.slice(1), command: "sync-railway-env", title: "asaje sync-railway-env" };
    }

    if (firstArg === "destroy-railway") {
      return { argv: rawArgs.slice(1), command: "destroy-railway", title: "asaje destroy-railway" };
    }

    if (firstArg === "create") {
      return { argv: rawArgs.slice(1), command: "create", title: "asaje create" };
    }

    return { argv: [], command: "help", title: "asaje" };
  }

  if (firstArg === "start") {
    return { argv: rawArgs.slice(1), command: "start", title: "create-asaje-go-vue" };
  }

  if (firstArg === "doctor") {
    return { argv: rawArgs.slice(1), command: "doctor", title: "create-asaje-go-vue" };
  }

  if (firstArg === "publish") {
    return { argv: rawArgs.slice(1), command: "publish", title: "create-asaje-go-vue" };
  }

  if (firstArg === "update") {
    return { argv: rawArgs.slice(1), command: "update", title: "create-asaje-go-vue" };
  }

  if (firstArg === "setup-railway") {
    return { argv: rawArgs.slice(1), command: "setup-railway", title: "create-asaje-go-vue" };
  }

  if (firstArg === "sync-railway-env") {
    return { argv: rawArgs.slice(1), command: "sync-railway-env", title: "create-asaje-go-vue" };
  }

  if (firstArg === "destroy-railway") {
    return { argv: rawArgs.slice(1), command: "destroy-railway", title: "create-asaje-go-vue" };
  }

  return { argv: rawArgs, command: "create", title: "create-asaje-go-vue" };
}

function printHelp() {
  console.log(pc.bold("\nCommands"));
  console.log(`- ${pc.bold("create-asaje-go-vue <directory>")} scaffold a new project`);
  console.log(`- ${pc.bold("asaje create <directory>")} scaffold a new project`);
  console.log(`- ${pc.bold("asaje start [directory]")} start a configured project`);
  console.log(`- ${pc.bold("asaje doctor [directory]")} check environment and project readiness`);
  console.log(`- ${pc.bold("asaje publish")} run npm publish checklist for the CLI package`);
  console.log(`- ${pc.bold("asaje update [directory]")} update managed boilerplate files from the template`);
  console.log(`- ${pc.bold("asaje setup-railway [directory]")} provision Railway infrastructure for a project`);
  console.log(`- ${pc.bold("asaje sync-railway-env [directory]")} sync Railway app variables without provisioning`);
  console.log(`- ${pc.bold("asaje destroy-railway [directory]")} delete the linked Railway environment or project`);
  console.log(pc.bold("\nExamples"));
  console.log(`- ${pc.bold("npx create-asaje-go-vue my-app")}`);
  console.log(`- ${pc.bold("node ./bin/create-asaje-go-vue.js my-app --yes")}`);
  console.log(`- ${pc.bold("node ./bin/asaje.js start ../my-app")}`);
  console.log(`- ${pc.bold("node ./bin/asaje.js doctor ..")}`);
  console.log(`- ${pc.bold("node ./bin/asaje.js publish")}`);
  console.log(`- ${pc.bold("node ./bin/asaje.js update .. --dry-run")}`);
  console.log(`- ${pc.bold("node ./bin/asaje.js setup-railway ..")}`);
  console.log(`- ${pc.bold("node ./bin/asaje.js sync-railway-env ..")}`);
  console.log(`- ${pc.bold("node ./bin/asaje.js destroy-railway ..")}`);
}

async function runCreate(argv) {
  const args = parseCreateArgs(argv);
  const answers = await collectCreateAnswers(args);
  const destinationDir = path.resolve(process.cwd(), answers.directory);

  await ensureDestinationIsAvailable(destinationDir);

  console.log(pc.dim("\nScaffolding project from GitHub template..."));
  await cloneTemplate(answers.template, answers.branch, destinationDir);
  await cleanupTemplateFiles(destinationDir);
  await writeProjectConfig(destinationDir, answers);
  await writeEnvFiles(destinationDir, answers);

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

function parseCreateArgs(argv) {
  const options = {
    branch: DEFAULT_BRANCH,
    installDependencies: undefined,
    startInfra: undefined,
    template: DEFAULT_TEMPLATE,
    yes: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--template") {
      options.template = argv[index + 1] || options.template;
      index += 1;
      continue;
    }

    if (arg.startsWith("--template=")) {
      options.template = arg.split("=")[1] || options.template;
      continue;
    }

    if (arg === "--branch") {
      options.branch = argv[index + 1] || options.branch;
      index += 1;
      continue;
    }

    if (arg.startsWith("--branch=")) {
      options.branch = arg.split("=")[1] || options.branch;
      continue;
    }

    if (arg === "--install") {
      options.installDependencies = true;
      continue;
    }

    if (arg === "--skip-install") {
      options.installDependencies = false;
      continue;
    }

    if (arg === "--start-infra") {
      options.startInfra = true;
      continue;
    }

    if (arg === "--skip-infra") {
      options.startInfra = false;
      continue;
    }

    positionals.push(arg);
  }

  return { ...options, directory: positionals[0] };
}

function parseUpdateArgs(argv) {
  const options = {
    branch: undefined,
    directory: ".",
    dryRun: false,
    include: [],
    template: undefined,
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

    if (arg === "--template") {
      options.template = argv[index + 1] || options.template;
      index += 1;
      continue;
    }

    if (arg.startsWith("--template=")) {
      options.template = arg.split("=")[1] || options.template;
      continue;
    }

    if (arg === "--branch") {
      options.branch = argv[index + 1] || options.branch;
      index += 1;
      continue;
    }

    if (arg.startsWith("--branch=")) {
      options.branch = arg.split("=")[1] || options.branch;
      continue;
    }

    if (arg === "--include") {
      options.include.push(...splitCommaSeparatedPaths(argv[index + 1] || ""));
      index += 1;
      continue;
    }

    if (arg.startsWith("--include=")) {
      options.include.push(...splitCommaSeparatedPaths(arg.split("=")[1] || ""));
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  options.include = uniquePaths(options.include);
  return options;
}

async function collectCreateAnswers(args) {
  const defaultDirectory = args.directory || "my-asaje-app";
  const defaultSlug = slugify(path.basename(defaultDirectory));
  const defaultAppName = titleize(defaultSlug || "asaje app");

  if (args.yes) {
    return buildCreateAnswers({
      adminPort: 5173,
      apiPort: 8080,
      appName: defaultAppName,
      branch: args.branch,
      bucketBasePath: defaultSlug,
      corsAllowedOrigins: "",
      defaultLocale: "fr",
      directory: defaultDirectory,
      installDependencies: args.installDependencies ?? true,
      mailFromEmail: `no-reply@${defaultSlug || "asaje-app"}.local`,
      mailFromName: defaultAppName,
      mailchimpApiKey: "dev-placeholder-key",
      mailProvider: "mailchimp-placeholder",
      realtimePort: 8090,
      seedAdmin: false,
      seedUser: false,
      startInfra: args.startInfra ?? true,
      storageProvider: "minio",
      swaggerUsername: "swagger",
      template: args.template,
    });
  }

  const directory = await prompt(
    text({
      defaultValue: defaultDirectory,
      message: "Project directory?",
      placeholder: "my-asaje-app",
      validate(value) {
        return value.trim().length === 0 ? "Directory is required" : undefined;
      },
    }),
  );

  const appName = await prompt(
    text({
      defaultValue: defaultAppName,
      message: "App name?",
      placeholder: "My Asaje App",
      validate(value) {
        return value.trim().length === 0 ? "App name is required" : undefined;
      },
    }),
  );

  const defaultLocale = await prompt(
    select({
      initialValue: "fr",
      message: "Default locale?",
      options: [
        { label: "French", value: "fr" },
        { label: "English", value: "en" },
      ],
    }),
  );

  const adminPort = await promptNumber("Admin dev server port?", 5173);
  const apiPort = await promptNumber("API port?", 8080);
  const realtimePort = await promptNumber("Realtime gateway port?", 8090);
  const swaggerUsername = await prompt(
    text({
      defaultValue: "swagger",
      message: "Swagger username?",
      validate(value) {
        return value.trim().length === 0 ? "Swagger username is required" : undefined;
      },
    }),
  );

  const seedAdmin = await prompt(
    confirm({
      initialValue: true,
      message: "Seed an admin account now?",
    }),
  );

  let adminName = "Admin";
  let adminEmail = "admin@example.com";
  let adminPassword = "admin12345";

  if (seedAdmin) {
    adminName = await prompt(
      text({
        defaultValue: adminName,
        message: "Admin name?",
        validate(value) {
          return value.trim().length >= 2 ? undefined : "Admin name must be at least 2 characters";
        },
      }),
    );

    adminEmail = await promptEmail("Admin email?", adminEmail);
    adminPassword = await promptSecret("Admin password?", 8);
  }

  const seedUser = await prompt(
    confirm({
      initialValue: false,
      message: "Seed a standard user too?",
    }),
  );

  let seedUserName = "User";
  let seedUserEmail = "user@example.com";
  let seedUserPassword = "user12345";

  if (seedUser) {
    seedUserName = await prompt(
      text({
        defaultValue: seedUserName,
        message: "User name?",
        validate(value) {
          return value.trim().length >= 2 ? undefined : "User name must be at least 2 characters";
        },
      }),
    );

    seedUserEmail = await promptEmail("User email?", seedUserEmail);
    seedUserPassword = await promptSecret("User password?", 8);
  }

  const storageProvider = await prompt(
    select({
      initialValue: "minio",
      message: "Object storage provider?",
      options: [
        { label: "Local MinIO", value: "minio" },
        { label: "AWS S3 / compatible", value: "aws" },
      ],
    }),
  );

  const slug = slugify(path.basename(directory));
  const bucketBasePath = await prompt(
    text({
      defaultValue: slug,
      message: "Bucket base path?",
      placeholder: slug,
    }),
  );

  let minioEndpoint = "localhost";
  let minioPort = 9000;
  let minioUseSSL = false;
  let minioAccessKey = "minioadmin";
  let minioSecretKey = "minioadmin";
  let minioBucket = "boilerplate-files";
  let minioPublicURL = "http://localhost:9000";
  let awsEndpointURL = "";
  let awsAccessKeyId = "";
  let awsSecretAccessKey = "";
  let awsBucket = "";
  let awsRegion = "us-east-1";

  if (storageProvider === "minio") {
    minioEndpoint = await prompt(
      text({
        defaultValue: minioEndpoint,
        message: "MinIO host?",
        validate(value) {
          return value.trim().length === 0 ? "MinIO host is required" : undefined;
        },
      }),
    );
    minioPort = await promptNumber("MinIO port?", minioPort);
    minioUseSSL = await prompt(
      confirm({
        initialValue: false,
        message: "Use SSL for MinIO?",
      }),
    );
    minioAccessKey = await prompt(
      text({
        defaultValue: minioAccessKey,
        message: "MinIO access key?",
        validate(value) {
          return value.trim().length === 0 ? "MinIO access key is required" : undefined;
        },
      }),
    );
    minioSecretKey = await promptSecret("MinIO secret key?", 3, minioSecretKey);
    minioBucket = await prompt(
      text({
        defaultValue: minioBucket,
        message: "MinIO bucket name?",
        validate(value) {
          return value.trim().length === 0 ? "MinIO bucket name is required" : undefined;
        },
      }),
    );
    minioPublicURL = await prompt(
      text({
        defaultValue: minioPublicURL,
        message: "MinIO public URL?",
        validate(value) {
          return isHttpUrl(value) ? undefined : "Enter a valid URL";
        },
      }),
    );
  } else {
    awsEndpointURL = await prompt(
      text({
        defaultValue: awsEndpointURL,
        message: "AWS endpoint URL? (leave empty for AWS)",
      }),
    );
    awsAccessKeyId = await prompt(
      text({
        message: "AWS access key id?",
        validate(value) {
          return value.trim().length === 0 ? "AWS access key id is required" : undefined;
        },
      }),
    );
    awsSecretAccessKey = await promptSecret("AWS secret access key?", 3);
    awsBucket = await prompt(
      text({
        message: "AWS bucket name?",
        validate(value) {
          return value.trim().length === 0 ? "AWS bucket name is required" : undefined;
        },
      }),
    );
    awsRegion = await prompt(
      text({
        defaultValue: awsRegion,
        message: "AWS region?",
        validate(value) {
          return value.trim().length === 0 ? "AWS region is required" : undefined;
        },
      }),
    );
  }

  const mailProvider = await prompt(
    select({
      initialValue: "mailchimp-placeholder",
      message: "Transactional email mode?",
      options: [
        { label: "Mailchimp placeholder key", value: "mailchimp-placeholder" },
        { label: "Configured Mailchimp Transactional", value: "mailchimp" },
      ],
    }),
  );

  const mailFromEmail = await promptEmail(
    "Transactional sender email?",
    `no-reply@${slug || "asaje-app"}.local`,
  );
  const mailFromName = await prompt(
    text({
      defaultValue: appName,
      message: "Transactional sender name?",
      validate(value) {
        return value.trim().length === 0 ? "Sender name is required" : undefined;
      },
    }),
  );
  const mailchimpApiKey =
    mailProvider === "mailchimp"
      ? await promptSecret("Mailchimp Transactional API key?", 3)
      : "dev-placeholder-key";

  const corsAllowedOrigins = await prompt(
    text({
      defaultValue: "",
      message: "Extra CORS origins? (comma-separated, optional)",
      placeholder: "https://app.example.com,https://admin.example.com",
    }),
  );

  const installDependencies = await prompt(
    confirm({
      initialValue: args.installDependencies ?? true,
      message: "Install dependencies now?",
    }),
  );

  const startInfra = await prompt(
    confirm({
      initialValue: args.startInfra ?? true,
      message: "Start local Docker services now?",
    }),
  );

  return buildCreateAnswers({
    adminEmail,
    adminName,
    adminPassword,
    adminPort,
    apiPort,
    appName,
    awsAccessKeyId,
    awsBucket,
    awsEndpointURL,
    awsRegion,
    awsSecretAccessKey,
    branch: args.branch,
    bucketBasePath,
    corsAllowedOrigins,
    defaultLocale,
    directory,
    installDependencies,
    mailFromEmail,
    mailFromName,
    mailProvider,
    mailchimpApiKey,
    minioAccessKey,
    minioBucket,
    minioEndpoint,
    minioPort,
    minioPublicURL,
    minioSecretKey,
    minioUseSSL,
    realtimePort,
    seedAdmin,
    seedUser,
    seedUserEmail,
    seedUserName,
    seedUserPassword,
    startInfra,
    storageProvider,
    swaggerUsername,
    template: args.template,
  });
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

function buildCreateAnswers(input) {
  const directory = input.directory.trim();
  const slug = slugify(path.basename(directory));
  const appName = input.appName.trim();
  const databaseName = slug.replace(/-/g, "_") || "asaje_app";
  const swaggerPassword = randomSecret(20);
  const jwtSecret = randomSecret(32);
  const corsAllowedOrigins = [
    `http://localhost:${input.adminPort}`,
    ...splitCsv(input.corsAllowedOrigins || ""),
  ];

  return {
    admin: input.seedAdmin
      ? {
          email: input.adminEmail.trim(),
          name: input.adminName.trim(),
          password: input.adminPassword,
        }
      : null,
    adminPort: input.adminPort,
    apiPort: input.apiPort,
    appName,
    aws: {
      accessKeyId: (input.awsAccessKeyId || "").trim(),
      bucket: (input.awsBucket || "").trim(),
      endpointUrl: (input.awsEndpointURL || "").trim(),
      region: (input.awsRegion || "us-east-1").trim(),
      secretAccessKey: input.awsSecretAccessKey || "",
    },
    branch: input.branch,
    bucketBasePath: (input.bucketBasePath || slug).trim(),
    corsAllowedOrigins,
    databaseName,
    defaultLocale: input.defaultLocale,
    directory,
    installDependencies: input.installDependencies,
    jwtSecret,
    mailFromEmail: input.mailFromEmail.trim(),
    mailFromName: input.mailFromName.trim(),
    mailProvider: input.mailProvider,
    mailchimpApiKey: input.mailchimpApiKey,
    minio: {
      accessKey: input.minioAccessKey || "minioadmin",
      bucket: input.minioBucket || "boilerplate-files",
      endpoint: input.minioEndpoint || "localhost",
      port: input.minioPort || 9000,
      publicUrl:
        input.minioPublicURL || `${input.minioUseSSL ? "https" : "http"}://${input.minioEndpoint}:${input.minioPort}`,
      secretKey: input.minioSecretKey || "minioadmin",
      useSSL: Boolean(input.minioUseSSL),
    },
    realtimePort: input.realtimePort,
    seedAdmin: input.seedAdmin,
    seedUser: input.seedUser,
    slug,
    standardUser: input.seedUser
      ? {
          email: input.seedUserEmail.trim(),
          name: input.seedUserName.trim(),
          password: input.seedUserPassword,
        }
      : null,
    startInfra: input.startInfra,
    storageProvider: input.storageProvider,
    swaggerPassword,
    swaggerUsername: input.swaggerUsername.trim(),
    template: input.template,
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
      realtime: answers.realtimePort,
    },
    locale: answers.defaultLocale,
    services: {
      storageProvider: answers.storageProvider,
      mailProvider: answers.mailProvider,
    },
  };

  await fs.writeJson(path.join(destinationDir, "asaje.config.json"), config, { spaces: 2 });
}

async function writeEnvFiles(destinationDir, answers) {
  await fs.writeFile(
    path.join(destinationDir, "admin/.env"),
    toEnvContent({
      VITE_APP_NAME: answers.appName,
      VITE_API_BASE_URL: `http://localhost:${answers.apiPort}/api/v1`,
      VITE_API_TIMEOUT_MS: "15000",
      VITE_REALTIME_BASE_URL: `http://localhost:${answers.realtimePort}`,
      VITE_REALTIME_DEFAULT_TRANSPORT: "sse",
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
    MAILCHIMP_TRANSACTIONAL_API_KEY: answers.mailchimpApiKey,
    MAIL_FROM_EMAIL: answers.mailFromEmail,
    MAIL_FROM_NAME: answers.mailFromName,
    RABBITMQ_URL: "amqp://guest:guest@localhost:5672/",
    RABBITMQ_TASKS_EXCHANGE: "boilerplate.tasks",
    RABBITMQ_REALTIME_EXCHANGE: "boilerplate.realtime",
    RABBITMQ_WORKER_QUEUE: `${answers.slug || "asaje-app"}.api.worker`,
    RABBITMQ_WORKER_CONSUMER_TAG: `${answers.slug || "asaje-app"}-api-worker`,
  };

  await fs.writeFile(path.join(destinationDir, "api/.env"), toEnvContent(apiEnv));

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
}

function printCreateSummary(destinationDir, answers) {
  console.log(pc.green("\nSetup complete."));
  console.log(`- Project: ${pc.bold(answers.appName)}`);
  console.log(`- Directory: ${pc.bold(destinationDir)}`);
  console.log(`- Template: ${pc.bold(`${answers.template}#${answers.branch}`)}`);
  console.log(`- Storage: ${pc.bold(answers.storageProvider)}`);
  console.log(`- Admin URL: ${pc.bold(`http://localhost:${answers.adminPort}`)}`);
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
  console.log(pc.dim("\nNote: OTP email delivery still requires a valid Mailchimp Transactional key for real email sends."));
}

async function runStart(argv) {
  const args = parseStartArgs(argv);
  const answers = await collectStartAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);

  await ensureProjectStructure(projectDir);
  await ensureEnvFiles(projectDir);

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

async function runSetupRailway(argv) {
  const args = parseSetupRailwayArgs(argv);
  const answers = await collectSetupRailwayAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);
  const projectConfig = await loadProjectConfig(projectDir);
  const projectSlug = resolveProjectSlug(projectDir, projectConfig);

  await ensureProjectStructure(projectDir);
  await ensureRailwayCliInstalled();
  await ensureRailwayAuthenticated(projectDir, answers.environment);
  await ensureRailwayEnvironmentLinked(projectDir, answers.environment);

  const manifest = await readRailwayManifest(projectDir);
  manifest.resources ||= {};
  const railwayContext = await loadRailwayContext(projectDir, answers.environment);
  railwayContext.environmentRef = answers.environment || railwayContext.environmentId || railwayContext.environmentName;
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
  for (const spec of RAILWAY_APP_SERVICE_SPECS) {
    const serviceName = buildRailwayAppServiceName(projectSlug, spec.baseName);
    const serviceResult = await ensureRailwayAppService({
      aliases: spec.aliases,
      dryRun: answers.dryRun,
      existingServices,
      key: spec.key,
      manifest,
      projectDir,
      railwayContext,
      serviceName,
      seedImage: spec.key === "admin" ? "nginx:1.29-alpine" : "alpine:3.22",
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
  updateRailwayManifestAppServices(manifest, servicesAfterProvision);
  await wireRailwayVariables({
    dryRun: answers.dryRun,
    manifest,
    projectDir,
    railwayContext,
    services: servicesAfterProvision,
    summary: variableSummary,
  });
  const deploymentResults = await deployRailwayAppServices({
    dryRun: answers.dryRun,
    manifest,
    projectDir,
    projectSlug,
    railwayContext,
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

async function runSyncRailwayEnv(argv) {
  const args = parseSetupRailwayArgs(argv);
  const answers = await collectSetupRailwayAnswers(args);
  const projectDir = path.resolve(process.cwd(), answers.directory);
  const projectConfig = await loadProjectConfig(projectDir);
  const projectSlug = resolveProjectSlug(projectDir, projectConfig);

  await ensureProjectStructure(projectDir);
  await ensureRailwayCliInstalled();
  await ensureRailwayAuthenticated(projectDir, answers.environment);
  await ensureRailwayEnvironmentLinked(projectDir, answers.environment);

  const manifest = await readRailwayManifest(projectDir);
  manifest.resources ||= {};
  manifest.appServices ||= {};

  const railwayContext = await loadRailwayContext(projectDir, answers.environment);
  railwayContext.environmentRef = answers.environment || railwayContext.environmentId || railwayContext.environmentName;
  const services = await discoverRailwayServices(railwayContext, projectDir);
  const variableSummary = [];

  updateRailwayManifestAppServices(manifest, services);
  await wireRailwayVariables({
    dryRun: answers.dryRun,
    manifest,
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
    dryRun: answers.dryRun,
    projectDir,
    railwayContext,
    resourceSummary: [],
    variableSummary,
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

function parseDirectoryArgs(argv) {
  return { directory: argv[0] || "." };
}

function parseSetupRailwayArgs(argv) {
  const options = {
    bucket: DEFAULT_RAILWAY_BUCKET,
    directory: ".",
    dryRun: false,
    environment: undefined,
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

    if (arg === "--bucket") {
      options.bucket = argv[index + 1] || options.bucket;
      index += 1;
      continue;
    }

    if (arg.startsWith("--bucket=")) {
      options.bucket = arg.split("=")[1] || options.bucket;
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

function parseDestroyRailwayArgs(argv) {
  const options = {
    directory: ".",
    dryRun: false,
    environment: undefined,
    scope: "environment",
    twoFactorCode: undefined,
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

    if (arg === "--environment" || arg === "-e") {
      options.environment = argv[index + 1] || options.environment;
      index += 1;
      continue;
    }

    if (arg.startsWith("--environment=")) {
      options.environment = arg.split("=")[1] || options.environment;
      continue;
    }

    if (arg === "--scope") {
      options.scope = argv[index + 1] || options.scope;
      index += 1;
      continue;
    }

    if (arg.startsWith("--scope=")) {
      options.scope = arg.split("=")[1] || options.scope;
      continue;
    }

    if (arg === "--2fa-code") {
      options.twoFactorCode = argv[index + 1] || options.twoFactorCode;
      index += 1;
      continue;
    }

    if (arg.startsWith("--2fa-code=")) {
      options.twoFactorCode = arg.split("=")[1] || options.twoFactorCode;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  if (!["environment", "project"].includes(options.scope)) {
    throw new Error("--scope must be either 'environment' or 'project'");
  }

  return options;
}

async function collectSetupRailwayAnswers(args) {
  if (args.yes) {
    return {
      bucket: args.bucket,
      directory: args.directory,
      dryRun: args.dryRun,
      environment: args.environment,
    };
  }

  const directory = await prompt(
    text({
      defaultValue: args.directory,
      message: "Project directory to configure on Railway?",
      placeholder: ".",
      validate(value) {
        return value.trim().length === 0 ? "Project directory is required" : undefined;
      },
    }),
  );

  const bucket = await prompt(
    text({
      defaultValue: args.bucket,
      message: "Object storage bucket name?",
      placeholder: DEFAULT_RAILWAY_BUCKET,
      validate(value) {
        return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value)
          ? undefined
          : "Use 3-63 lowercase letters, numbers, dots, or hyphens";
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
    bucket,
    directory,
    dryRun: args.dryRun,
    environment: environment?.trim() || undefined,
  };
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
  const manifestPath = path.join(projectDir, RAILWAY_MANIFEST_FILENAME);
  if (!(await fs.pathExists(manifestPath))) {
    return {
      appServices: {},
      bucket: DEFAULT_RAILWAY_BUCKET,
      environmentId: null,
      environmentName: null,
      projectSlug: null,
      projectId: null,
      projectName: null,
      resources: {},
      updatedAt: null,
    };
  }

  return fs.readJson(manifestPath);
}

async function writeRailwayManifest(projectDir, manifest) {
  const manifestPath = path.join(projectDir, RAILWAY_MANIFEST_FILENAME);
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
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

  const auth = getRailwayApiAuth();
  if (!auth || !railwayContext.projectId) {
    return [];
  }

  try {
    const response = await fetch(RAILWAY_GRAPHQL_ENDPOINT, {
      body: JSON.stringify({
        query: `query SetupRailwayServices($projectId: String!) {
          project(id: $projectId) {
            services {
              edges {
                node {
                  id
                  name
                  icon
                }
              }
            }
          }
        }`,
        variables: {
          projectId: railwayContext.projectId,
        },
      }),
      headers: {
        ...auth.headers,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const nodes = payload?.data?.project?.services?.edges || [];
    return nodes
      .map((edge) => edge?.node)
      .filter(Boolean)
      .map((service) => ({
        icon: typeof service.icon === "string" ? service.icon : null,
        id: typeof service.id === "string" ? service.id : null,
        name: typeof service.name === "string" ? service.name : null,
      }));
  } catch {
    return [];
  }
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

function getRailwayApiAuth() {
  if (process.env.RAILWAY_API_TOKEN) {
    return {
      headers: {
        Authorization: `Bearer ${process.env.RAILWAY_API_TOKEN}`,
      },
    };
  }

  if (process.env.RAILWAY_TOKEN) {
    return {
      headers: {
        "Project-Access-Token": process.env.RAILWAY_TOKEN,
      },
    };
  }

  return null;
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
  for (const spec of RAILWAY_APP_SERVICE_SPECS) {
    const manifestEntry = config.manifest.appServices?.[spec.key];
    const defaultServiceName = buildRailwayAppServiceName(config.projectSlug, spec.baseName);
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
      `asaje setup-railway: deploy ${targetServiceName}`,
    ]);
    summary.push({ directory: spec.directory, serviceName: targetServiceName, status: "deployed" });
  }

  return summary;
}

async function wireRailwayVariables(config) {
  console.log(pc.bold("\nVariables"));

  const localEnv = await loadRailwayLocalEnvDefaults(config.projectDir);

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
    admin: findRailwayService(config.services, ["admin", "frontend", "web"], config.manifest.appServices?.admin?.serviceName),
    api: findRailwayService(config.services, ["api", "backend", "server"], config.manifest.appServices?.api?.serviceName),
    realtime: findRailwayService(
      config.services,
      ["realtime-gateway", "realtime"],
      config.manifest.appServices?.realtime?.serviceName,
    ),
  };

  updateRailwayManifestAppServices(config.manifest, Object.values(appServices).filter(Boolean));

  if (!appServices.api) {
    console.log(`- ${pc.yellow("api")} service not found, skipping API variable wiring`);
  }
  if (!appServices.realtime) {
    console.log(`- ${pc.yellow("realtime-gateway")} service not found, skipping realtime variable wiring`);
  }
  if (!appServices.admin) {
    console.log(`- ${pc.yellow("admin")} service not found, skipping admin variable wiring`);
  }
  if (!infra.postgres) {
    console.log(`- ${pc.yellow("postgres")} resource not found, DATABASE_URL wiring will be skipped`);
  }
  if (!infra.rabbitmq) {
    console.log(`- ${pc.yellow("rabbitmq")} resource not found, RABBITMQ_URL wiring will be skipped`);
  }
  if (!infra.objectStorage) {
    console.log(`- ${pc.yellow("object-storage")} resource not found, S3 variable wiring will be skipped`);
  }

  if (appServices.api) {
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
    if (appServices.admin?.name) {
      variables.CORS_ALLOWED_ORIGINS = `https://${railwayReference(appServices.admin.name, "RAILWAY_PUBLIC_DOMAIN")}`;
    }
    await applyRailwayVariables({
      dryRun: config.dryRun,
      environment: config.railwayContext.environmentRef,
      projectDir: config.projectDir,
      serviceName: appServices.api.name,
      summary: config.summary,
      variables,
    });
  }

  if (appServices.realtime) {
    const variables = {};
    Object.assign(variables, buildRealtimeDefaults(localEnv));
    if (infra.rabbitmq?.name) {
      variables.RABBITMQ_URL = buildRabbitMqUrlReference(infra.rabbitmq.name);
    }
    if (appServices.api?.name) {
      variables.JWT_SECRET = railwayReference(appServices.api.name, "JWT_SECRET");
    }
    if (appServices.admin?.name) {
      variables.CORS_ALLOWED_ORIGINS = `https://${railwayReference(appServices.admin?.name || "admin", "RAILWAY_PUBLIC_DOMAIN")}`;
    }
    await applyRailwayVariables({
      dryRun: config.dryRun,
      environment: config.railwayContext.environmentRef,
      projectDir: config.projectDir,
      serviceName: appServices.realtime.name,
      summary: config.summary,
      variables,
    });
  }

  if (appServices.admin) {
    const variables = {};
    Object.assign(variables, buildAdminDefaults(localEnv));
    if (appServices.api?.name) {
      variables.VITE_API_BASE_URL = `https://${railwayReference(appServices.api.name, "RAILWAY_PUBLIC_DOMAIN")}/api/v1`;
    }
    if (appServices.realtime?.name) {
      variables.VITE_REALTIME_BASE_URL = `https://${railwayReference(appServices.realtime.name, "RAILWAY_PUBLIC_DOMAIN")}`;
    }
    await applyRailwayVariables({
      dryRun: config.dryRun,
      environment: config.railwayContext.environmentRef,
      projectDir: config.projectDir,
      serviceName: appServices.admin.name,
      summary: config.summary,
      variables,
    });
  }
}

async function loadRailwayLocalEnvDefaults(projectDir) {
  const [apiEnv, realtimeEnv, adminEnv] = await Promise.all([
    tryReadEnvFile(path.join(projectDir, "api/.env")),
    tryReadEnvFile(path.join(projectDir, "realtime-gateway/.env")),
    tryReadEnvFile(path.join(projectDir, "admin/.env")),
  ]);

  return {
    admin: adminEnv,
    api: apiEnv,
    realtime: realtimeEnv,
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
      DEFAULT_LOCALE: localEnv.api.DEFAULT_LOCALE || "fr",
      FILE_MAX_SIZE_MB: localEnv.api.FILE_MAX_SIZE_MB || "25",
      FILE_SIGNED_URL_TTL_MINUTES: localEnv.api.FILE_SIGNED_URL_TTL_MINUTES || "15",
      JWT_SECRET: jwtSecret,
      LOGIN_OTP_TTL_MINUTES: localEnv.api.LOGIN_OTP_TTL_MINUTES || "10",
      MAILCHIMP_TRANSACTIONAL_API_KEY: localEnv.api.MAILCHIMP_TRANSACTIONAL_API_KEY || "dev-placeholder-key",
      MAIL_FROM_EMAIL: localEnv.api.MAIL_FROM_EMAIL || "no-reply@example.com",
      MAIL_FROM_NAME: localEnv.api.MAIL_FROM_NAME || "Boilerplate API",
      PASSWORD_RESET_OTP_TTL_MINUTES: localEnv.api.PASSWORD_RESET_OTP_TTL_MINUTES || "15",
      RABBITMQ_REALTIME_EXCHANGE: localEnv.api.RABBITMQ_REALTIME_EXCHANGE || "boilerplate.realtime",
      RABBITMQ_TASKS_EXCHANGE: localEnv.api.RABBITMQ_TASKS_EXCHANGE || "boilerplate.tasks",
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
    VITE_REALTIME_DEFAULT_TRANSPORT: localEnv.admin.VITE_REALTIME_DEFAULT_TRANSPORT || "sse",
    VITE_REALTIME_RECONNECT_DELAY_MS: localEnv.admin.VITE_REALTIME_RECONNECT_DELAY_MS || "3000",
  };
}

function sanitizeSecret(value, placeholder) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === placeholder) {
    return "";
  }
  return normalized;
}

async function tryReadEnvFile(filePath) {
  if (!(await fs.pathExists(filePath))) {
    return {};
  }

  return readEnvFile(filePath);
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

  if (config.dryRun) {
    console.log(`- ${pc.cyan(config.serviceName)} would set ${entries.map(([key]) => key).join(", ")}`);
    config.summary.push({
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
    keys: entries.map(([key]) => key),
    serviceName: config.serviceName,
    status: "updated",
  });
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

function findRailwayService(services, aliases, preferredName) {
  if (preferredName) {
    const exact = services.find(
      (service) => normalizeRailwayServiceName(service.name) === normalizeRailwayServiceName(preferredName),
    );
    if (exact) {
      return exact;
    }
  }

  const normalizedAliases = aliases.map(normalizeRailwayServiceName);
  return services.find((service) => {
    const normalizedName = normalizeRailwayServiceName(service.name);
    return normalizedAliases.some((alias) => normalizedName === alias || normalizedName.endsWith(`-${alias}`));
  });
}

function normalizeRailwayServiceName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRailwayServices(services) {
  const seen = new Set();
  const normalized = [];

  for (const service of services) {
    const name = pickFirstString([service.name, service.serviceName]);
    if (!name) {
      continue;
    }

    const id = pickFirstString([service.id, service.serviceId]);
    const key = `${normalizeRailwayServiceName(name)}:${id || ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({ id, name });
  }

  return normalized;
}

function findCreatedRailwayService(config) {
  const beforeServices = normalizeRailwayServices(config.beforeServices);
  const afterServices = normalizeRailwayServices(config.servicesAfter);
  const beforeKeys = new Set(beforeServices.map(createRailwayServiceIdentity));
  const newServices = afterServices.filter((service) => !beforeKeys.has(createRailwayServiceIdentity(service)));

  if (newServices.length === 1) {
    return newServices[0];
  }

  const aliasMatch = findRailwayService(newServices, config.aliases, config.manifestServiceName);
  if (aliasMatch) {
    return aliasMatch;
  }

  return null;
}

function createRailwayServiceIdentity(service) {
  if (service?.id) {
    return `id:${service.id}`;
  }

  return `name:${normalizeRailwayServiceName(service?.name)}`;
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

function updateRailwayManifestAppServices(manifest, services) {
  manifest.appServices ||= {};

  const entries = [
    [
      "api",
      findRailwayService(
        services,
        ["api", "backend", "server"],
        manifest.appServices.api?.serviceName || buildRailwayAppServiceName(manifest.projectSlug, "api"),
      ),
    ],
    [
      "admin",
      findRailwayService(
        services,
        ["admin", "frontend", "web"],
        manifest.appServices.admin?.serviceName || buildRailwayAppServiceName(manifest.projectSlug, "admin"),
      ),
    ],
    [
      "realtime",
      findRailwayService(
        services,
        ["realtime-gateway", "realtime"],
        manifest.appServices.realtime?.serviceName || buildRailwayAppServiceName(manifest.projectSlug, "realtime-gateway"),
      ),
    ],
  ];

  for (const [key, service] of entries) {
    if (!service?.name) {
      continue;
    }

    manifest.appServices[key] = {
      serviceId: service.id || manifest.appServices[key]?.serviceId || null,
      serviceName: service.name,
    };
  }
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

function parseStartArgs(argv) {
  const options = {
    directory: ".",
    installDependencies: undefined,
    profile: undefined,
    startInfra: undefined,
    yes: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--install") {
      options.installDependencies = true;
      continue;
    }

    if (arg === "--skip-install") {
      options.installDependencies = false;
      continue;
    }

    if (arg === "--start-infra") {
      options.startInfra = true;
      continue;
    }

    if (arg === "--skip-infra") {
      options.startInfra = false;
      continue;
    }

    if (arg === "--profile") {
      options.profile = argv[index + 1] || options.profile;
      index += 1;
      continue;
    }

    if (arg.startsWith("--profile=")) {
      options.profile = arg.split("=")[1] || options.profile;
      continue;
    }

    if (arg === "--skip-api") {
      options.api = false;
      continue;
    }

    if (arg === "--skip-worker") {
      options.worker = false;
      continue;
    }

    if (arg === "--skip-realtime") {
      options.realtime = false;
      continue;
    }

    if (arg === "--skip-admin") {
      options.admin = false;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  return options;
}

async function collectStartAnswers(args) {
  if (args.yes) {
    return {
      directory: args.directory,
      installDependencies: args.installDependencies ?? false,
      profile: args.profile || inferProfileFromArgs(args) || "full",
      selectedServices: buildSelectedServices(args),
      startInfra: args.startInfra ?? true,
    };
  }

  const directory = await prompt(
    text({
      defaultValue: args.directory,
      message: "Project directory to start?",
      placeholder: ".",
      validate(value) {
        return value.trim().length === 0 ? "Project directory is required" : undefined;
      },
    }),
  );

  const installDependencies = await prompt(
    confirm({
      initialValue: args.installDependencies ?? false,
      message: "Install dependencies before start?",
    }),
  );

  const startInfra = await prompt(
    confirm({
      initialValue: args.startInfra ?? true,
      message: "Start local Docker services?",
    }),
  );

  const profile = await prompt(
    select({
      initialValue: inferProfileFromArgs(args) || "full",
      message: "Startup profile?",
      options: [
        { label: "Full stack", value: "full" },
        { label: "Backend only", value: "backend-only" },
        { label: "Frontend only", value: "frontend-only" },
        { label: "Custom", value: "custom" },
      ],
    }),
  );

  if (profile !== "custom") {
    return {
      directory,
      installDependencies,
      profile,
      selectedServices: profileToServices(profile),
      startInfra,
    };
  }

  const api = await prompt(
    confirm({
      initialValue: args.api ?? true,
      message: "Start API server?",
    }),
  );
  const worker = await prompt(
    confirm({
      initialValue: args.worker ?? true,
      message: "Start API worker?",
    }),
  );
  const realtime = await prompt(
    confirm({
      initialValue: args.realtime ?? true,
      message: "Start realtime gateway?",
    }),
  );
  const admin = await prompt(
    confirm({
      initialValue: args.admin ?? true,
      message: "Start admin frontend?",
    }),
  );

  return {
    directory,
    installDependencies,
    profile: "custom",
    selectedServices: [api && "api", worker && "worker", realtime && "realtime", admin && "admin"].filter(Boolean),
    startInfra,
  };
}

function buildSelectedServices(args) {
  if (args.profile) {
    return applyServiceOverrides(profileToServices(args.profile), args);
  }

  return applyServiceOverrides(profileToServices("full"), args);
}

function inferProfileFromArgs(args) {
  const selected = [args.api !== false && "api", args.worker !== false && "worker", args.realtime !== false && "realtime", args.admin !== false && "admin"].filter(Boolean);

  if (selected.length === 4) {
    return "full";
  }

  if (arraysEqual(selected, profileToServices("backend-only"))) {
    return "backend-only";
  }

  if (arraysEqual(selected, profileToServices("frontend-only"))) {
    return "frontend-only";
  }

  return undefined;
}

function profileToServices(profile) {
  switch (profile) {
    case "backend-only":
      return ["api", "worker", "realtime"];
    case "frontend-only":
      return ["admin"];
    case "custom":
      return [];
    case "full":
    default:
      return ["api", "worker", "realtime", "admin"];
  }
}

function applyServiceOverrides(services, args) {
  return services.filter((service) => args[service] !== false);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function ensureProjectStructure(projectDir) {
  const requiredPaths = ["admin", "api", "realtime-gateway", "docker-compose.yml"];

  for (const relativePath of requiredPaths) {
    const target = path.join(projectDir, relativePath);
    if (!(await fs.pathExists(target))) {
      throw new Error(`Project root not recognized, missing ${relativePath} in ${projectDir}`);
    }
  }
}

async function loadProjectConfig(projectDir) {
  const configPath = path.join(projectDir, "asaje.config.json");
  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  return fs.readJson(configPath);
}

function resolveProjectSlug(projectDir, projectConfig) {
  return slugify(projectConfig?.projectSlug || projectConfig?.projectName || path.basename(projectDir) || "asaje-app");
}

function buildRailwayAppServiceName(projectSlug, baseName) {
  const normalizedSlug = slugify(projectSlug || "asaje-app");
  const normalizedBaseName = slugify(baseName);
  return `${normalizedSlug}-${normalizedBaseName}`;
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

function splitCommaSeparatedPaths(value) {
  return value
    .split(",")
    .map((entry) => normalizeRelativePath(entry))
    .filter(Boolean);
}

function uniquePaths(paths) {
  return [...new Set(paths.map((entry) => normalizeRelativePath(entry)).filter(Boolean))];
}

function normalizeRelativePath(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/^\.\//, "").replace(/\\/g, "/").replace(/\/$/, "");
}

async function ensureEnvFiles(projectDir) {
  for (const spec of ENV_FILE_SPECS) {
    const envPath = path.join(projectDir, spec.envPath);
    if (await fs.pathExists(envPath)) {
      continue;
    }

    const examplePath = path.join(projectDir, spec.examplePath);
    if (!(await fs.pathExists(examplePath))) {
      throw new Error(`Missing ${spec.envPath} and ${spec.examplePath}`);
    }

    await fs.copyFile(examplePath, envPath);
    console.log(pc.yellow(`- Created ${spec.envPath} from ${spec.examplePath}`));
  }
}

async function loadRuntimeConfig(projectDir) {
  const configPath = path.join(projectDir, "asaje.config.json");
  let ports = { admin: 5173, api: 8080, realtime: 8090 };

  if (await fs.pathExists(configPath)) {
    const fileConfig = await fs.readJson(configPath);
    ports = {
      admin: Number(fileConfig?.ports?.admin || ports.admin),
      api: Number(fileConfig?.ports?.api || ports.api),
      realtime: Number(fileConfig?.ports?.realtime || ports.realtime),
    };
  } else {
    const apiEnv = await readEnvFile(path.join(projectDir, "api/.env"));
    const realtimeEnv = await readEnvFile(path.join(projectDir, "realtime-gateway/.env"));
    const adminEnv = await readEnvFile(path.join(projectDir, "admin/.env"));
    ports = {
      admin: Number(adminEnv.VITE_ADMIN_PORT || ports.admin),
      api: Number(apiEnv.PORT || ports.api),
      realtime: Number(realtimeEnv.PORT || ports.realtime),
    };
  }

  return { ports };
}

function printStartSummary(projectDir, runtimeConfig, profile, selectedServices) {
  console.log(pc.green("\nStarting project services."));
  console.log(`- Directory: ${pc.bold(projectDir)}`);
  console.log(`- Profile: ${pc.bold(profile)}`);
  console.log(`- Services: ${pc.bold(selectedServices.join(", "))}`);
  console.log(`- Admin URL: ${pc.bold(`http://localhost:${runtimeConfig.ports.admin}`)}`);
  console.log(`- API URL: ${pc.bold(`http://localhost:${runtimeConfig.ports.api}/api/v1`)}`);
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

function createManagedProcess(spec) {
  const child = execa(spec.command, spec.args, {
    cwd: spec.cwd,
    stderr: "pipe",
    stdout: "pipe",
  });

  const prefix = spec.color(`[${spec.name}] `);
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(prefixChunk(prefix, chunk));
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(prefixChunk(prefix, chunk));
  });

  const managed = child.then((result) => ({ ...result, name: spec.name }));
  managed.kill = (...args) => child.kill(...args);
  return managed;
}

function prefixChunk(prefix, chunk) {
  const textValue = chunk.toString();
  const normalized = textValue.replace(/\n/g, `\n${prefix}`);
  return `${prefix}${normalized}`;
}

async function cloneTemplate(template, branch, destinationDir) {
  const fallbackBranches = [branch, "main", "master", "develop"].filter(
    (value, index, array) => value && array.indexOf(value) === index,
  );
  let lastError = null;

  for (const candidate of fallbackBranches) {
    try {
      const emitter = degit(`${template}#${candidate}`, {
        cache: false,
        force: false,
        verbose: false,
      });
      await emitter.clone(destinationDir);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Unable to clone template ${template}`);
}

async function cleanupTemplateFiles(destinationDir) {
  for (const relativePath of EXCLUDED_TEMPLATE_PATHS) {
    await fs.remove(path.join(destinationDir, relativePath));
  }
}

async function ensureDestinationIsAvailable(destinationDir) {
  const exists = await fs.pathExists(destinationDir);
  if (!exists) {
    return;
  }

  const files = await fs.readdir(destinationDir);
  if (files.length > 0) {
    throw new Error(`Destination already exists and is not empty: ${destinationDir}`);
  }
}

async function installProjectDependencies(projectDir) {
  await runCommand("pnpm", ["install"], path.join(projectDir, "admin"));
  await runCommand("go", ["mod", "download"], path.join(projectDir, "api"));
  await runCommand("go", ["mod", "download"], path.join(projectDir, "realtime-gateway"));
}

async function startInfrastructure(projectDir) {
  await runCommand(
    "docker",
    ["compose", "up", "-d", "postgres", "rabbitmq", "minio", "minio-create-bucket"],
    projectDir,
  );
}

async function runCommand(command, args, cwd) {
  await execa(command, args, {
    cwd,
    stdio: "inherit",
  });
}

async function checkCommand(spec) {
  try {
    const result = await execa(spec.command, spec.args, {
      reject: false,
    });

    if (result.exitCode !== 0) {
      return { message: `${spec.name} unavailable`, ok: false };
    }

    const version = (result.stdout || result.stderr || "").split(/\r?\n/)[0].trim();
    return { message: `${spec.name} detected${version ? ` (${version})` : ""}`, ok: true };
  } catch {
    return { message: `${spec.name} unavailable`, ok: false };
  }
}

async function readEnvFile(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  const result = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function toEnvContent(values) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${escapeEnvValue(String(value))}`)
    .join("\n")}\n`;
}

function escapeEnvValue(value) {
  if (value === "") {
    return "";
  }

  if (/\s|#|"/.test(value)) {
    return JSON.stringify(value);
  }

  return value;
}

async function prompt(promise) {
  const result = await promise;
  if (isCancel(result)) {
    cancel("Operation cancelled");
    process.exit(0);
  }
  return result;
}

async function promptNumber(message, defaultValue) {
  const result = await prompt(
    text({
      defaultValue: String(defaultValue),
      message,
      validate(value) {
        const number = Number(value);
        return Number.isInteger(number) && number > 0 ? undefined : "Enter a positive integer";
      },
    }),
  );

  return Number(result);
}

async function promptEmail(message, defaultValue) {
  return prompt(
    text({
      defaultValue,
      message,
      validate(value) {
        return value.includes("@") ? undefined : "Enter a valid email";
      },
    }),
  );
}

async function promptSecret(message, minLength, defaultValue) {
  return prompt(
    password({
      message,
      ...(defaultValue ? { mask: "*" } : {}),
      validate(value) {
        return value.length >= minLength ? undefined : `Must be at least ${minLength} characters`;
      },
    }),
  );
}

function splitCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleize(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function randomSecret(bytes) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function shellEscape(value) {
  if (/^[a-zA-Z0-9_./-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
