import path from "node:path";
import fs from "fs-extra";
import { readEnvFile, tryReadEnvFile } from "../cli/env.js";
import { runCommand } from "../cli/process.js";

export const ENV_FILE_SPECS = [
  { envPath: "admin/.env", examplePath: "admin/.env.example" },
  { envPath: "api/.env", examplePath: "api/.env.example" },
  { envPath: "realtime-gateway/.env", examplePath: "realtime-gateway/.env.example" },
  { envPath: "landing/.env", examplePath: "landing/.env.example" },
  { envPath: "pwa/.env", examplePath: "pwa/.env.example" },
];

export async function ensureEnvFiles(projectDir, options = {}) {
  const envFileSpecs = options.envFileSpecs || ENV_FILE_SPECS;
  const onCreated = options.onCreated || (() => {});

  for (const spec of envFileSpecs) {
    const serviceDir = spec.envPath.split("/")[0];
    if (!(await fs.pathExists(path.join(projectDir, serviceDir)))) {
      continue;
    }

    const envPath = path.join(projectDir, spec.envPath);
    if (await fs.pathExists(envPath)) {
      continue;
    }

    const examplePath = path.join(projectDir, spec.examplePath);
    if (!(await fs.pathExists(examplePath))) {
      throw new Error(`Missing ${spec.envPath} and ${spec.examplePath}`);
    }

    await fs.copyFile(examplePath, envPath);
    onCreated(spec);
  }
}

export async function loadRuntimeConfig(projectDir) {
  const configPath = path.join(projectDir, "asaje.config.json");
  let ports = { admin: 5173, api: 8080, realtime: 8090, landing: 8088, pwa: 4174 };

  if (await fs.pathExists(configPath)) {
    const fileConfig = await fs.readJson(configPath);
    ports = {
      admin: Number(fileConfig?.ports?.admin || ports.admin),
      api: Number(fileConfig?.ports?.api || ports.api),
      landing: Number(fileConfig?.ports?.landing || ports.landing),
      pwa: Number(fileConfig?.ports?.pwa || ports.pwa),
      realtime: Number(fileConfig?.ports?.realtime || ports.realtime),
    };
  } else {
    const [apiEnv, realtimeEnv, adminEnv, landingEnv, pwaEnv] = await Promise.all([
      readEnvFile(path.join(projectDir, "api/.env")),
      readEnvFile(path.join(projectDir, "realtime-gateway/.env")),
      readEnvFile(path.join(projectDir, "admin/.env")),
      tryReadEnvFile(path.join(projectDir, "landing/.env")),
      tryReadEnvFile(path.join(projectDir, "pwa/.env")),
    ]);
    ports = {
      admin: Number(adminEnv.VITE_ADMIN_PORT || ports.admin),
      api: Number(apiEnv.PORT || ports.api),
      landing: Number(landingEnv.PORT || ports.landing),
      pwa: Number(pwaEnv.PORT || pwaEnv.VITE_PORT || ports.pwa),
      realtime: Number(realtimeEnv.PORT || ports.realtime),
    };
  }

  return { ports };
}

export async function installProjectDependencies(projectDir, options = {}) {
  const runCommandImpl = options.runCommandImpl || runCommand;
  await runCommandImpl("pnpm", ["install"], path.join(projectDir, "admin"));
  if (await fs.pathExists(path.join(projectDir, "landing/package.json"))) {
    await runCommandImpl("pnpm", ["install"], path.join(projectDir, "landing"));
  }
  if (await fs.pathExists(path.join(projectDir, "pwa/package.json"))) {
    await runCommandImpl("pnpm", ["install"], path.join(projectDir, "pwa"));
  }
  await runCommandImpl("go", ["mod", "download"], path.join(projectDir, "api"));
  await runCommandImpl("go", ["mod", "download"], path.join(projectDir, "realtime-gateway"));
}

export async function startInfrastructure(projectDir, options = {}) {
  const runCommandImpl = options.runCommandImpl || runCommand;
  await runCommandImpl(
    "docker",
    ["compose", "up", "-d", "postgres", "rabbitmq", "minio", "minio-create-bucket"],
    projectDir,
  );
}
