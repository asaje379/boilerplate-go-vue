import path from "node:path";
import { randomSecret, slugify, splitCsv } from "../cli/strings.js";

export function buildCreateAnswers(input) {
  const directory = input.directory.trim();
  const slug = slugify(path.basename(directory));
  const appName = input.appName.trim();
  const databaseName = slug.replace(/-/g, "_") || "asaje_app";
  const swaggerPassword = randomSecret(20);
  const jwtSecret = randomSecret(32);
  const corsAllowedOrigins = [
    `http://localhost:${input.adminPort}`,
    ...(input.includeLanding ? ["http://localhost:8088"] : []),
    ...(input.includePwa ? ["http://localhost:4174"] : []),
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
    brevoApiKey: input.brevoApiKey || "",
    bucketBasePath: (input.bucketBasePath || slug).trim(),
    corsAllowedOrigins,
    databaseName,
    defaultLocale: input.defaultLocale,
    directory,
    github: {
      enabled: Boolean(input.enableGithubWorkflow),
      branchEnvironments: Boolean(input.enableGithubWorkflow)
        ? [
            { branch: (input.productionBranch || "main").trim(), environment: "production" },
            { branch: (input.stagingBranch || "develop").trim(), environment: "staging" },
          ].filter((entry, index, items) => entry.branch && items.findIndex((candidate) => candidate.branch === entry.branch) === index)
        : [],
    },
    includeLanding: Boolean(input.includeLanding),
    includePwa: Boolean(input.includePwa),
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
    smtp: {
      host: (input.smtpHost || "").trim(),
      password: input.smtpPassword || "",
      port: input.smtpPort || 587,
      useSSL: Boolean(input.smtpUseSSL),
      username: (input.smtpUsername || "").trim(),
    },
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
