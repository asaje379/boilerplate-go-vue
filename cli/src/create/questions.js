import path from "node:path";
import { confirm, select, text } from "@clack/prompts";
import { prompt, promptEmail, promptNumber, promptSecret } from "../cli/prompts.js";
import { isHttpUrl, slugify, titleize } from "../cli/strings.js";
import { buildCreateAnswers } from "./answers.js";

export async function collectCreateAnswers(args) {
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
      includeLanding: true,
      includePwa: true,
      installDependencies: args.installDependencies ?? true,
      mailFromEmail: `no-reply@${defaultSlug || "asaje-app"}.local`,
      mailFromName: defaultAppName,
      mailProvider: "mailchimp",
      mailchimpApiKey: "dev-placeholder-key",
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

  const seedAdmin = await prompt(confirm({ initialValue: true, message: "Seed an admin account now?" }));

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

  const seedUser = await prompt(confirm({ initialValue: false, message: "Seed a standard user too?" }));

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
  const bucketBasePath = await prompt(text({ defaultValue: slug, message: "Bucket base path?", placeholder: slug }));

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
    minioUseSSL = await prompt(confirm({ initialValue: false, message: "Use SSL for MinIO?" }));
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
    awsEndpointURL = await prompt(text({ defaultValue: awsEndpointURL, message: "AWS endpoint URL? (leave empty for AWS)" }));
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
      initialValue: "mailchimp",
      message: "Transactional email mode?",
      options: [
        { label: "Mailchimp Transactional", value: "mailchimp" },
        { label: "Brevo", value: "brevo" },
        { label: "SMTP", value: "smtp" },
      ],
    }),
  );

  const mailFromEmail = await promptEmail("Transactional sender email?", `no-reply@${slug || "asaje-app"}.local`);
  const mailFromName = await prompt(
    text({
      defaultValue: appName,
      message: "Transactional sender name?",
      validate(value) {
        return value.trim().length === 0 ? "Sender name is required" : undefined;
      },
    }),
  );
  const mailchimpApiKey = mailProvider === "mailchimp" ? await promptSecret("Mailchimp Transactional API key?", 3) : "";
  const brevoApiKey = mailProvider === "brevo" ? await promptSecret("Brevo API key?", 3) : "";
  const smtpHost =
    mailProvider === "smtp"
      ? await prompt(
          text({
            defaultValue: "smtp.gmail.com",
            message: "SMTP host?",
            validate(value) {
              return value.trim().length === 0 ? "SMTP host is required" : undefined;
            },
          }),
        )
      : "";
  const smtpPort = mailProvider === "smtp" ? await promptNumber("SMTP port?", 587) : 587;
  const smtpUsername = mailProvider === "smtp" ? await prompt(text({ defaultValue: "", message: "SMTP username?" })) : "";
  const smtpPassword = mailProvider === "smtp" ? await promptSecret("SMTP password?", 0, "") : "";
  const smtpUseSSL = mailProvider === "smtp" ? await prompt(confirm({ initialValue: false, message: "Use SSL for SMTP?" })) : false;

  const includeLanding = await prompt(confirm({ initialValue: true, message: "Enable the optional landing surface?" }));
  const includePwa = await prompt(confirm({ initialValue: true, message: "Enable the optional PWA surface?" }));

  const enableGithubWorkflow = await prompt(
    confirm({ initialValue: true, message: "Generate a GitHub Actions Railway deploy workflow?" }),
  );
  const productionBranch = enableGithubWorkflow
    ? await prompt(
        text({
          defaultValue: "main",
          message: "Production branch?",
          validate(value) {
            return value.trim().length === 0 ? "Production branch is required" : undefined;
          },
        }),
      )
    : "main";
  const stagingBranch = enableGithubWorkflow
    ? await prompt(
        text({
          defaultValue: "develop",
          message: "Staging branch?",
          validate(value) {
            return value.trim().length === 0 ? "Staging branch is required" : undefined;
          },
        }),
      )
    : "develop";

  const corsAllowedOrigins = await prompt(
    text({
      defaultValue: "",
      message: "Extra CORS origins? (comma-separated, optional)",
      placeholder: "https://app.example.com,https://admin.example.com",
    }),
  );

  const installDependencies = await prompt(confirm({ initialValue: args.installDependencies ?? true, message: "Install dependencies now?" }));
  const startInfra = await prompt(confirm({ initialValue: args.startInfra ?? true, message: "Start local Docker services now?" }));

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
    enableGithubWorkflow,
    includeLanding,
    includePwa,
    installDependencies,
    brevoApiKey,
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
    smtpHost,
    smtpPassword,
    smtpPort,
    smtpUseSSL,
    smtpUsername,
    stagingBranch,
    template: args.template,
    productionBranch,
  });
}
