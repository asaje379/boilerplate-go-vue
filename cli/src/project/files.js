import path from "node:path";
import degit from "degit";
import fs from "fs-extra";

export async function cloneTemplate(template, branch, destinationDir, options = {}) {
  const degitImpl = options.degitImpl || degit;
  const fallbackBranches = [branch, "main", "master", "develop"].filter(
    (value, index, array) => value && array.indexOf(value) === index,
  );
  let lastError = null;

  for (const candidate of fallbackBranches) {
    try {
      const emitter = degitImpl(`${template}#${candidate}`, {
        cache: false,
        force: false,
        verbose: false,
      });
      await emitter.clone(destinationDir);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Unable to clone template ${template}`);
}

export async function cleanupTemplateFiles(destinationDir, excludedTemplatePaths = ["cli"]) {
  for (const relativePath of excludedTemplatePaths) {
    await fs.remove(path.join(destinationDir, relativePath));
  }
}

export async function ensureScaffoldedSurfaces(destinationDir, answers) {
  const requiredDirectories = ["admin", "api", "realtime-gateway"];

  if (answers.includeLanding) {
    requiredDirectories.push("landing");
  }
  if (answers.includePwa) {
    requiredDirectories.push("pwa");
  }

  const missing = [];
  for (const relativeDir of requiredDirectories) {
    if (!(await fs.pathExists(path.join(destinationDir, relativeDir)))) {
      missing.push(relativeDir);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Template scaffold is missing expected directories: ${missing.join(", ")}. ` +
      `This usually means the selected template/branch does not include the requested surfaces. ` +
      `Try another branch or update the template repository before running create again.`,
    );
  }
}

export async function ensureDestinationIsAvailable(destinationDir) {
  const exists = await fs.pathExists(destinationDir);
  if (!exists) {
    return;
  }

  const files = await fs.readdir(destinationDir);
  if (files.length > 0) {
    throw new Error(`Destination already exists and is not empty: ${destinationDir}. Choose another directory or empty it before running create.`);
  }
}

export async function ensureProjectStructure(projectDir) {
  const requiredPaths = ["admin", "api", "realtime-gateway", "docker-compose.yml"];

  for (const relativePath of requiredPaths) {
    const target = path.join(projectDir, relativePath);
    if (!(await fs.pathExists(target))) {
      throw new Error(`Project root not recognized, missing ${relativePath} in ${projectDir}`);
    }
  }
}

export async function loadProjectConfig(projectDir) {
  const configPath = path.join(projectDir, "asaje.config.json");
  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  return fs.readJson(configPath);
}
