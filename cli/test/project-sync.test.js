import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import fs from "fs-extra";
import {
  buildScannedRailwayServiceSpec,
  buildSyncedProjectConfig,
  getRailwayConfig,
  inferRailwayServiceIdentity,
  mergeScannedRailwayServices,
  scanProjectForManagedRailwayServices,
  shouldSkipProjectScanDirectory,
  synthesizeDerivedRailwayServices,
} from "../src/project/sync.js";

describe("project sync helpers", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "asaje-sync-test-"));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("returns safe Railway config objects", () => {
    assert.deepEqual(getRailwayConfig(null), {});
    assert.deepEqual(getRailwayConfig({ railway: [] }), {});
    assert.deepEqual(getRailwayConfig({ railway: { variablesMode: "sync-managed" } }), { variablesMode: "sync-managed" });
  });

  it("infers service identities", () => {
    assert.deepEqual(inferRailwayServiceIdentity("api"), { aliases: ["api", "backend", "server"], baseName: "api", key: "api" });
    assert.deepEqual(inferRailwayServiceIdentity("services/realtime-gateway"), { aliases: ["realtime-gateway", "realtime"], baseName: "realtime-gateway", key: "realtime" });
    assert.deepEqual(inferRailwayServiceIdentity("billing-service"), { aliases: ["billing-service"], baseName: "billing-service", key: "billing-service" });
  });

  it("skips generated and hidden directories", () => {
    assert.equal(shouldSkipProjectScanDirectory("node_modules", "admin/node_modules"), true);
    assert.equal(shouldSkipProjectScanDirectory("cli", "cli"), true);
    assert.equal(shouldSkipProjectScanDirectory(".well-known", "public/.well-known"), false);
    assert.equal(shouldSkipProjectScanDirectory("src", "admin/src"), false);
  });

  it("builds scanned specs and derived worker service", () => {
    assert.equal(buildScannedRailwayServiceSpec(tempDir, "Dockerfile"), null);
    const api = buildScannedRailwayServiceSpec(tempDir, "api/Dockerfile");
    assert.deepEqual(api, {
      aliases: ["api", "backend", "server"],
      baseName: "api",
      directory: "api",
      dockerfile: "api/Dockerfile",
      key: "api",
      seedImage: "alpine:3.22",
      serviceName: null,
    });

    assert.deepEqual(synthesizeDerivedRailwayServices([api]).map((spec) => spec.key), ["api", "worker"]);
  });

  it("scans Dockerfiles while ignoring skipped directories", async () => {
    await fs.outputFile(path.join(tempDir, "api/Dockerfile"), "");
    await fs.outputFile(path.join(tempDir, "admin/Dockerfile"), "");
    await fs.outputFile(path.join(tempDir, "node_modules/pkg/Dockerfile"), "");

    const summary = await scanProjectForManagedRailwayServices(tempDir);

    assert.deepEqual(summary.dockerfiles, ["admin/Dockerfile", "api/Dockerfile"]);
    assert.deepEqual(summary.serviceSpecs.map((spec) => spec.key), ["admin", "api", "worker"]);
  });

  it("merges scanned services with previous config", () => {
    assert.deepEqual(mergeScannedRailwayServices([
      { aliases: ["api", "backend"], baseName: "custom-api", directory: "api", key: "api", seedImage: "custom", serviceName: "my-api" },
    ], [
      { aliases: ["api", "server"], baseName: "api", directory: "api", dockerfile: "api/Dockerfile", key: "api", seedImage: "alpine", serviceName: null },
    ]), [
      { aliases: ["api", "backend", "server"], baseName: "custom-api", directory: "api", dockerfile: "api/Dockerfile", key: "api", seedImage: "custom", serviceName: "my-api" },
    ]);
  });

  it("builds synced project config", () => {
    const config = buildSyncedProjectConfig("/tmp/My App", {
      railway: { variablesMode: "preserve-remote" },
    }, [
      { aliases: ["api"], baseName: "api", directory: "api", dockerfile: "api/Dockerfile", key: "api", seedImage: "alpine", serviceName: null },
    ]);

    assert.equal(config.projectName, "My App");
    assert.equal(config.projectSlug, "my-app");
    assert.equal(config.railway.variablesMode, "preserve-remote");
    assert.deepEqual(config.railway.services, [
      { aliases: ["api", "backend", "server"], baseName: "api", directory: "api", dockerfile: "api/Dockerfile", key: "api", seedImage: "alpine" },
    ]);
  });
});
