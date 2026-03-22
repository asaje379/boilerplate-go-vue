#!/usr/bin/env node

import crypto from "node:crypto";
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

    if (firstArg === "create") {
      return { argv: rawArgs.slice(1), command: "create", title: "asaje create" };
    }

    return { argv: [], command: "help", title: "asaje" };
  }

  if (firstArg === "start") {
    return { argv: rawArgs.slice(1), command: "start", title: "create-asaje-go-vue" };
  }

  return { argv: rawArgs, command: "create", title: "create-asaje-go-vue" };
}

function printHelp() {
  console.log(pc.bold("\nCommands"));
  console.log(`- ${pc.bold("create-asaje-go-vue <directory>")} scaffold a new project`);
  console.log(`- ${pc.bold("asaje create <directory>")} scaffold a new project`);
  console.log(`- ${pc.bold("asaje start [directory]")} start a configured project`);
  console.log(pc.bold("\nExamples"));
  console.log(`- ${pc.bold("npx create-asaje-go-vue my-app")}`);
  console.log(`- ${pc.bold("node ./bin/create-asaje-go-vue.js my-app --yes")}`);
  console.log(`- ${pc.bold("node ./bin/asaje.js start ../my-app")}`);
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
  printStartSummary(projectDir, runtimeConfig, answers.selectedServices);
  await startManagedProcesses(projectDir, runtimeConfig, answers.selectedServices);
}

function parseStartArgs(argv) {
  const options = {
    directory: ".",
    installDependencies: undefined,
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
    selectedServices: [api && "api", worker && "worker", realtime && "realtime", admin && "admin"].filter(Boolean),
    startInfra,
  };
}

function buildSelectedServices(args) {
  return [args.api !== false && "api", args.worker !== false && "worker", args.realtime !== false && "realtime", args.admin !== false && "admin"].filter(Boolean);
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

function printStartSummary(projectDir, runtimeConfig, selectedServices) {
  console.log(pc.green("\nStarting project services."));
  console.log(`- Directory: ${pc.bold(projectDir)}`);
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
