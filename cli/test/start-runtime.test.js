import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import fs from "fs-extra";
import {
  ensureEnvFiles,
  installProjectDependencies,
  loadRuntimeConfig,
  startInfrastructure,
} from "../src/start/runtime.js";

describe("start runtime helpers", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "asaje-runtime-test-"));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("creates missing env files from examples", async () => {
    await fs.ensureDir(path.join(tempDir, "admin"));
    await fs.outputFile(path.join(tempDir, "admin/.env.example"), "VITE_ADMIN_PORT=5173\n");
    const created = [];

    await ensureEnvFiles(tempDir, { onCreated: (spec) => created.push(spec.envPath) });

    assert.equal(await fs.readFile(path.join(tempDir, "admin/.env"), "utf8"), "VITE_ADMIN_PORT=5173\n");
    assert.deepEqual(created, ["admin/.env"]);
  });

  it("errors when env example is missing", async () => {
    await fs.ensureDir(path.join(tempDir, "api"));

    await assert.rejects(() => ensureEnvFiles(tempDir), /Missing api\/.env and api\/.env.example/);
  });

  it("loads runtime ports from project config", async () => {
    await fs.writeJson(path.join(tempDir, "asaje.config.json"), {
      ports: { admin: 3000, api: 9000, landing: 3001, pwa: 3002, realtime: 9001 },
    });

    assert.deepEqual(await loadRuntimeConfig(tempDir), {
      ports: { admin: 3000, api: 9000, landing: 3001, pwa: 3002, realtime: 9001 },
    });
  });

  it("loads runtime ports from env files", async () => {
    await fs.outputFile(path.join(tempDir, "admin/.env"), "VITE_ADMIN_PORT=5174\n");
    await fs.outputFile(path.join(tempDir, "api/.env"), "PORT=8081\n");
    await fs.outputFile(path.join(tempDir, "realtime-gateway/.env"), "PORT=8091\n");
    await fs.outputFile(path.join(tempDir, "landing/.env"), "PORT=8089\n");
    await fs.outputFile(path.join(tempDir, "pwa/.env"), "VITE_PORT=4175\n");

    assert.deepEqual(await loadRuntimeConfig(tempDir), {
      ports: { admin: 5174, api: 8081, landing: 8089, pwa: 4175, realtime: 8091 },
    });
  });

  it("runs dependency installation commands for existing surfaces", async () => {
    await fs.outputFile(path.join(tempDir, "landing/package.json"), "{}");
    const calls = [];

    await installProjectDependencies(tempDir, {
      runCommandImpl: async (...args) => calls.push(args),
    });

    assert.deepEqual(calls, [
      ["pnpm", ["install"], path.join(tempDir, "admin")],
      ["pnpm", ["install"], path.join(tempDir, "landing")],
      ["go", ["mod", "download"], path.join(tempDir, "api")],
      ["go", ["mod", "download"], path.join(tempDir, "realtime-gateway")],
    ]);
  });

  it("starts local infrastructure", async () => {
    const calls = [];
    await startInfrastructure(tempDir, { runCommandImpl: async (...args) => calls.push(args) });

    assert.deepEqual(calls, [[
      "docker",
      ["compose", "up", "-d", "postgres", "rabbitmq", "minio", "minio-create-bucket"],
      tempDir,
    ]]);
  });
});
