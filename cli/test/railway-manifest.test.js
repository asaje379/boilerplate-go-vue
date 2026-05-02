import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import fs from "fs-extra";
import {
  createDefaultRailwayManifest,
  readRailwayManifest,
  writeRailwayManifest,
} from "../src/railway/manifest.js";

const filename = "asaje.railway.json";

describe("Railway manifest helpers", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "asaje-manifest-test-"));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("creates the default manifest shape", () => {
    assert.deepEqual(createDefaultRailwayManifest("files"), {
      appServices: {},
      bucket: "files",
      environmentId: null,
      environmentName: null,
      projectSlug: null,
      projectId: null,
      projectName: null,
      resources: {},
      updatedAt: null,
    });
  });

  it("returns defaults when manifest file is missing", async () => {
    assert.deepEqual(await readRailwayManifest(tempDir, { defaultBucket: "files", filename }), createDefaultRailwayManifest("files"));
  });

  it("round-trips manifest JSON", async () => {
    const manifest = {
      ...createDefaultRailwayManifest("files"),
      appServices: {
        api: { serviceId: "svc_api", serviceName: "my-api" },
      },
      projectSlug: "my-app",
    };

    await writeRailwayManifest(tempDir, manifest, { filename });

    assert.deepEqual(await readRailwayManifest(tempDir, { defaultBucket: "ignored", filename }), manifest);
  });
});
