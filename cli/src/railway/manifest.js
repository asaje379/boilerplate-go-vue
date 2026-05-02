import path from "node:path";
import fs from "fs-extra";

export function createDefaultRailwayManifest(defaultBucket) {
  return {
    appServices: {},
    bucket: defaultBucket,
    environmentId: null,
    environmentName: null,
    projectSlug: null,
    projectId: null,
    projectName: null,
    resources: {},
    updatedAt: null,
  };
}

export async function readRailwayManifest(projectDir, options = {}) {
  const manifestPath = path.join(projectDir, options.filename);
  if (!(await fs.pathExists(manifestPath))) {
    return createDefaultRailwayManifest(options.defaultBucket);
  }

  return fs.readJson(manifestPath);
}

export async function writeRailwayManifest(projectDir, manifest, options = {}) {
  const manifestPath = path.join(projectDir, options.filename);
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
}
