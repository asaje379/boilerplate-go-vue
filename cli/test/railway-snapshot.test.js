import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import fs from "fs-extra";
import {
  assertRailwaySnapshotImportable,
  buildRailwayConfigExportFilename,
  buildRailwayConfigSnapshotDiff,
  buildRailwayFieldDiff,
  readRailwayConfigSnapshot,
  sanitizeRailwayConfigSnapshotDiff,
} from "../src/railway/snapshot.js";

describe("Railway snapshot helpers", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "asaje-snapshot-test-"));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("builds export filenames", () => {
    assert.equal(buildRailwayConfigExportFilename({ directory: "/tmp/app", environment: { configKey: "Production Env" } }), "/tmp/app/.railway-config.production-env.json");
  });

  it("reads and validates snapshots", async () => {
    await fs.writeJson(path.join(tempDir, "snapshot.json"), { services: [] });
    assert.deepEqual(await readRailwayConfigSnapshot("snapshot.json", { cwd: tempDir }), { services: [] });

    await fs.writeJson(path.join(tempDir, "invalid.json"), { services: {} });
    await assert.rejects(() => readRailwayConfigSnapshot("invalid.json", { cwd: tempDir }), /missing a services array/);
  });

  it("rejects redacted snapshots for import", () => {
    assert.doesNotThrow(() => assertRailwaySnapshotImportable({ services: [{ key: "api", variables: { PORT: "8080" } }] }));
    assert.throws(
      () => assertRailwaySnapshotImportable({ services: [{ key: "api", variables: { JWT_SECRET: "[redacted]" } }] }),
      /api.JWT_SECRET/,
    );
  });

  it("builds field and snapshot diffs", () => {
    assert.deepEqual(buildRailwayFieldDiff("a", "b"), { left: "a", right: "b", status: "changed" });
    const diff = buildRailwayConfigSnapshotDiff({
      directory: "left",
      environment: { configKey: "prod" },
      services: [{ directory: "api", key: "api", serviceName: "api", variables: { A: "1", SECRET: "old-secret-value" } }],
    }, {
      directory: "right",
      environment: { configKey: "staging" },
      services: [{ directory: "api", key: "api", serviceName: "api-v2", variables: { A: "2", B: "3", SECRET: "new-secret-value" } }],
    });

    assert.equal(diff.services[0].metadata.serviceName.status, "changed");
    assert.deepEqual(diff.services[0].variables.added.map((entry) => entry.key), ["B"]);
    assert.deepEqual(diff.services[0].variables.changed.map((entry) => entry.key), ["A", "SECRET"]);
  });

  it("sanitizes snapshot diffs", () => {
    const diff = buildRailwayConfigSnapshotDiff({
      services: [{ key: "api", variables: { JWT_SECRET: "old-secret-value" } }],
    }, {
      services: [{ key: "api", variables: { JWT_SECRET: "new-secret-value" } }],
    });

    assert.equal(sanitizeRailwayConfigSnapshotDiff(diff, false).services[0].variables.changed[0].currentValue, "old...[redacted]...ue");
    assert.equal(sanitizeRailwayConfigSnapshotDiff(diff, true).services[0].variables.changed[0].currentValue, "old-secret-value");
  });
});
