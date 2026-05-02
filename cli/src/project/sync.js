import path from "node:path";
import fs from "fs-extra";
import { slugify, uniqueStrings } from "../cli/strings.js";
import { normalizeRailwayServiceName, resolveRailwayAppServiceSpecs } from "../railway/services.js";

export function getRailwayConfig(projectConfig) {
  const railwayConfig = projectConfig?.railway;
  return railwayConfig && typeof railwayConfig === "object" && !Array.isArray(railwayConfig) ? railwayConfig : {};
}

export async function scanProjectForManagedRailwayServices(projectDir) {
  const dockerfiles = [];
  await collectDockerfiles(projectDir, "", dockerfiles);

  const scannedSpecs = dockerfiles
    .map((dockerfilePath) => buildScannedRailwayServiceSpec(projectDir, dockerfilePath))
    .filter(Boolean)
    .sort((left, right) => left.directory.localeCompare(right.directory));

  const serviceSpecs = synthesizeDerivedRailwayServices(scannedSpecs);

  return {
    dockerfiles,
    serviceSpecs,
  };
}

export function synthesizeDerivedRailwayServices(serviceSpecs) {
  const nextSpecs = [...serviceSpecs];
  const hasAPI = serviceSpecs.some((spec) => spec.key === "api" && spec.directory === "api");
  const hasWorker = serviceSpecs.some((spec) => spec.key === "worker");
  if (hasAPI && !hasWorker) {
    nextSpecs.push({
      aliases: ["worker", "api-worker"],
      baseName: "worker",
      directory: "api",
      dockerfile: "api/Dockerfile",
      key: "worker",
      seedImage: "alpine:3.22",
      serviceName: null,
    });
  }

  return nextSpecs.sort((left, right) => `${left.directory}:${left.key}`.localeCompare(`${right.directory}:${right.key}`));
}

export async function collectDockerfiles(projectDir, relativeDir, results) {
  const absoluteDir = path.join(projectDir, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    const nextRelativePath = relativeDir ? path.posix.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (shouldSkipProjectScanDirectory(entry.name, nextRelativePath)) {
        continue;
      }

      await collectDockerfiles(projectDir, nextRelativePath, results);
      continue;
    }

    if (entry.isFile() && entry.name === "Dockerfile") {
      results.push(nextRelativePath);
    }
  }
}

export function shouldSkipProjectScanDirectory(name, relativePath) {
  const normalized = String(name || "").trim();
  if (!normalized) {
    return false;
  }

  if ([".git", ".turbo", ".next", ".nuxt", "node_modules", "dist", "build", "coverage", "tmp", "vendor"].includes(normalized)) {
    return true;
  }

  if (relativePath === "cli") {
    return true;
  }

  return normalized.startsWith(".") && normalized !== ".well-known";
}

export function buildScannedRailwayServiceSpec(projectDir, dockerfilePath) {
  const directory = path.posix.dirname(dockerfilePath);
  if (!directory || directory === ".") {
    return null;
  }

  const inferred = inferRailwayServiceIdentity(directory);
  return {
    aliases: inferred.aliases,
    baseName: inferred.baseName,
    directory,
    dockerfile: dockerfilePath,
    key: inferred.key,
    seedImage: inferred.key === "admin" ? "nginx:1.29-alpine" : "alpine:3.22",
    serviceName: null,
  };
}

export function inferRailwayServiceIdentity(directory) {
  const normalizedDirectory = directory.replace(/\/+$/g, "");
  const directoryName = path.posix.basename(normalizedDirectory);
  const normalizedName = normalizeRailwayServiceName(directoryName);

  if (["api", "backend", "server"].includes(normalizedName)) {
    return { aliases: ["api", "backend", "server"], baseName: "api", key: "api" };
  }
  if (["admin", "frontend", "web"].includes(normalizedName)) {
    return { aliases: ["admin", "frontend", "web"], baseName: "admin", key: "admin" };
  }
  if (["realtime", "realtime-gateway"].includes(normalizedName)) {
    return { aliases: ["realtime-gateway", "realtime"], baseName: "realtime-gateway", key: "realtime" };
  }

  const slug = slugify(directoryName);
  return { aliases: [slug], baseName: slug, key: slug };
}

export function buildSyncedProjectConfig(projectDir, projectConfig, scannedServiceSpecs) {
  const nextConfig = {
    ...(projectConfig || {}),
    projectName: projectConfig?.projectName || path.basename(projectDir),
    projectSlug: projectConfig?.projectSlug || slugify(path.basename(projectDir)),
  };

  const previousServices = resolveRailwayAppServiceSpecs(projectConfig);
  const mergedServices = mergeScannedRailwayServices(previousServices, scannedServiceSpecs);

  nextConfig.railway = {
    ...(getRailwayConfig(projectConfig) || {}),
    services: mergedServices.map((service) => ({
      baseName: service.baseName,
      directory: service.directory,
      ...(service.dockerfile ? { dockerfile: service.dockerfile } : {}),
      key: service.key,
      ...(service.aliases?.length > 0 ? { aliases: service.aliases } : {}),
      ...(service.serviceName ? { serviceName: service.serviceName } : {}),
      ...(service.seedImage ? { seedImage: service.seedImage } : {}),
    })),
  };

  return nextConfig;
}

export function mergeScannedRailwayServices(previousServices, scannedServiceSpecs) {
  const previousByKey = new Map(previousServices.map((service) => [service.key, service]));
  const previousByDirectory = new Map(previousServices.map((service) => [service.directory, service]));

  return scannedServiceSpecs.map((scanned) => {
    const previous = previousByKey.get(scanned.key) || previousByDirectory.get(scanned.directory);
    return {
      aliases: uniqueStrings([...(previous?.aliases || []), ...scanned.aliases]),
      baseName: previous?.baseName || scanned.baseName,
      directory: scanned.directory,
      dockerfile: scanned.dockerfile,
      key: previous?.key || scanned.key,
      seedImage: previous?.seedImage || scanned.seedImage,
      serviceName: previous?.serviceName || null,
    };
  });
}
