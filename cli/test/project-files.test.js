import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import fs from "fs-extra";
import {
  cleanupTemplateFiles,
  cloneTemplate,
  ensureDestinationIsAvailable,
  ensureProjectStructure,
  ensureScaffoldedSurfaces,
  loadProjectConfig,
} from "../src/project/files.js";

describe("project file helpers", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "asaje-files-test-"));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("allows missing or empty destinations and rejects non-empty ones", async () => {
    await ensureDestinationIsAvailable(path.join(tempDir, "missing"));
    await fs.ensureDir(path.join(tempDir, "empty"));
    await ensureDestinationIsAvailable(path.join(tempDir, "empty"));

    await fs.outputFile(path.join(tempDir, "non-empty/file.txt"), "content");
    await assert.rejects(
      () => ensureDestinationIsAvailable(path.join(tempDir, "non-empty")),
      /Destination already exists and is not empty/,
    );
  });

  it("cleans excluded template files", async () => {
    await fs.outputFile(path.join(tempDir, "cli/file.txt"), "remove");
    await fs.outputFile(path.join(tempDir, "admin/file.txt"), "keep");

    await cleanupTemplateFiles(tempDir, ["cli"]);

    assert.equal(await fs.pathExists(path.join(tempDir, "cli")), false);
    assert.equal(await fs.pathExists(path.join(tempDir, "admin/file.txt")), true);
  });

  it("validates scaffolded surfaces", async () => {
    for (const dir of ["admin", "api", "realtime-gateway", "landing"]) {
      await fs.ensureDir(path.join(tempDir, dir));
    }

    await ensureScaffoldedSurfaces(tempDir, { includeLanding: true, includePwa: false });
    await assert.rejects(
      () => ensureScaffoldedSurfaces(tempDir, { includeLanding: true, includePwa: true }),
      /Template scaffold is missing expected directories: pwa/,
    );
  });

  it("validates project structure and loads config", async () => {
    for (const dir of ["admin", "api", "realtime-gateway"]) {
      await fs.ensureDir(path.join(tempDir, dir));
    }
    await fs.outputFile(path.join(tempDir, "docker-compose.yml"), "services: {}");
    await fs.writeJson(path.join(tempDir, "asaje.config.json"), { projectName: "App" });

    await ensureProjectStructure(tempDir);
    assert.deepEqual(await loadProjectConfig(tempDir), { projectName: "App" });
    assert.equal(await loadProjectConfig(path.join(tempDir, "admin")), null);
  });

  it("falls back template branches while cloning", async () => {
    const calls = [];
    await cloneTemplate("org/repo", "feature", tempDir, {
      degitImpl: (source, options) => ({
        async clone(destination) {
          calls.push({ destination, options, source });
          if (source.endsWith("#feature")) {
            throw new Error("missing branch");
          }
        },
      }),
    });

    assert.deepEqual(calls.map((call) => call.source), ["org/repo#feature", "org/repo#main"]);
  });
});
