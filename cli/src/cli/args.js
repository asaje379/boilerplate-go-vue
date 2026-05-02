import { splitCommaSeparatedPaths, uniquePaths } from "./paths.js";

export function parseCreateArgs(argv, defaults = {}) {
  const options = {
    branch: defaults.defaultBranch || "main",
    installDependencies: undefined,
    startInfra: undefined,
    template: defaults.defaultTemplate || "asaje379/boilerplate-go-vue",
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

export function parseUpdateArgs(argv) {
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

export function parseDirectoryArgs(argv) {
  return { directory: argv[0] || "." };
}

export function parseSetupRailwayArgs(argv, defaults = {}) {
  const options = {
    bucket: defaults.defaultBucket || "boilerplate-files",
    bucketProvided: false,
    directory: ".",
    diff: false,
    dryRun: false,
    environment: undefined,
    services: [],
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

    if (arg === "--bucket") {
      options.bucket = argv[index + 1] || options.bucket;
      options.bucketProvided = true;
      index += 1;
      continue;
    }

    if (arg.startsWith("--bucket=")) {
      options.bucket = arg.split("=")[1] || options.bucket;
      options.bucketProvided = true;
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

    if (arg === "--service") {
      options.services.push(argv[index + 1] || "");
      index += 1;
      continue;
    }

    if (arg.startsWith("--service=")) {
      options.services.push(arg.split("=")[1] || "");
      continue;
    }

    if (arg === "--services") {
      options.services.push(...splitCsv(argv[index + 1] || ""));
      index += 1;
      continue;
    }

    if (arg.startsWith("--services=")) {
      options.services.push(...splitCsv(arg.split("=")[1] || ""));
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  options.services = uniqueStrings(options.services);
  return options;
}

export function parseDeployRailwayArgs(argv) {
  const options = {
    directory: ".",
    dryRun: false,
    environment: undefined,
    services: [],
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

    if (arg === "--service") {
      options.services.push(argv[index + 1] || "");
      index += 1;
      continue;
    }

    if (arg.startsWith("--service=")) {
      options.services.push(arg.split("=")[1] || "");
      continue;
    }

    if (arg === "--services") {
      options.services.push(...splitCsv(argv[index + 1] || ""));
      index += 1;
      continue;
    }

    if (arg.startsWith("--services=")) {
      options.services.push(...splitCsv(arg.split("=")[1] || ""));
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  options.services = uniqueStrings(options.services);
  return options;
}

export function parseDestroyRailwayArgs(argv) {
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

export function parseStartArgs(argv) {
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

    if (arg === "--skip-landing") {
      options.landing = false;
      continue;
    }

    if (arg === "--skip-pwa") {
      options.pwa = false;
      continue;
    }

    positionals.push(arg);
  }

  options.directory = positionals[0] || options.directory;
  return options;
}

function splitCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
