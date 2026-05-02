import path from "node:path";
import fs from "fs-extra";
import { slugify } from "../cli/strings.js";
import { buildRailwayVariableDiff, formatRailwayVariableValue } from "./variables.js";

export function buildRailwayConfigExportFilename(payload) {
  const envSuffix = slugify(payload.environment.configKey || payload.environment.railwayEnvironment || "default") || "default";
  return path.join(payload.directory, `.railway-config.${envSuffix}.json`);
}

export async function readRailwayConfigSnapshot(filePath, options = {}) {
  const cwd = options.cwd || process.cwd();
  const absolutePath = path.resolve(cwd, filePath);
  if (!(await fs.pathExists(absolutePath))) {
    throw new Error(`Railway config snapshot not found: ${absolutePath}`);
  }

  const payload = await fs.readJson(absolutePath);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Railway config snapshot is invalid: ${absolutePath}`);
  }

  if (!Array.isArray(payload.services)) {
    throw new Error(`Railway config snapshot is missing a services array: ${absolutePath}`);
  }

  return payload;
}

export function assertRailwaySnapshotImportable(snapshot) {
  const redactedEntries = [];
  for (const service of snapshot.services || []) {
    for (const [key, value] of Object.entries(service.variables || {})) {
      if (String(value || "").includes("[redacted]")) {
        redactedEntries.push(`${service.key}.${key}`);
      }
    }
  }

  if (redactedEntries.length > 0) {
    throw new Error(
      `Snapshot contains redacted values and cannot be imported safely. Re-export with --show-secrets. Problem keys: ${redactedEntries.join(", ")}`,
    );
  }
}

export function buildRailwayConfigSnapshotDiff(left, right) {
  const leftServices = new Map((left.services || []).map((service) => [service.key, service]));
  const rightServices = new Map((right.services || []).map((service) => [service.key, service]));
  const serviceKeys = [...new Set([...leftServices.keys(), ...rightServices.keys()])].sort();

  const services = serviceKeys.map((key) => {
    const leftService = leftServices.get(key) || null;
    const rightService = rightServices.get(key) || null;
    return {
      key,
      metadata: {
        directory: buildRailwayFieldDiff(leftService?.directory, rightService?.directory),
        dockerfile: buildRailwayFieldDiff(leftService?.dockerfile, rightService?.dockerfile),
        serviceName: buildRailwayFieldDiff(leftService?.serviceName, rightService?.serviceName),
      },
      status: !leftService ? "added" : !rightService ? "removed" : "present",
      variables: buildRailwayVariableDiff(leftService?.variables || {}, rightService?.variables || {}),
    };
  });

  return {
    left: {
      directory: left.directory,
      environment: left.environment,
    },
    right: {
      directory: right.directory,
      environment: right.environment,
    },
    services,
  };
}

export function buildRailwayFieldDiff(leftValue, rightValue) {
  return {
    left: leftValue ?? null,
    right: rightValue ?? null,
    status: leftValue === rightValue ? "unchanged" : leftValue === undefined ? "added" : rightValue === undefined ? "removed" : "changed",
  };
}

export function sanitizeRailwayConfigSnapshotDiff(diff, showSecrets) {
  if (showSecrets) {
    return diff;
  }

  return {
    ...diff,
    services: diff.services.map((service) => ({
      ...service,
      variables: {
        added: service.variables.added.map(sanitizeRailwayDiffEntry),
        changed: service.variables.changed.map(sanitizeRailwayDiffEntry),
        removed: service.variables.removed.map(sanitizeRailwayDiffEntry),
        unchanged: service.variables.unchanged.map(sanitizeRailwayDiffEntry),
      },
    })),
  };
}

export function sanitizeRailwayDiffEntry(entry) {
  return {
    ...entry,
    currentValue: formatRailwayVariableValue(entry.key, entry.currentValue),
    nextValue: formatRailwayVariableValue(entry.key, entry.nextValue),
  };
}
