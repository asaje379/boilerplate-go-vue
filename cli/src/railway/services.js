import path from "node:path";

export const DEFAULT_RAILWAY_APP_SERVICE_SPECS = [
  {
    aliases: ["api", "backend", "server"],
    baseName: "api",
    directory: "api",
    key: "api",
  },
  {
    aliases: ["worker", "api-worker"],
    baseName: "worker",
    directory: "api",
    key: "worker",
  },
  {
    aliases: ["admin", "frontend", "web"],
    baseName: "admin",
    directory: "admin",
    key: "admin",
  },
  {
    aliases: ["realtime-gateway", "realtime"],
    baseName: "realtime-gateway",
    directory: "realtime-gateway",
    key: "realtime",
  },
  {
    aliases: ["landing", "marketing"],
    baseName: "landing",
    directory: "landing",
    key: "landing",
  },
  {
    aliases: ["pwa", "mobile-web"],
    baseName: "pwa",
    directory: "pwa",
    key: "pwa",
  },
];

export function resolveRailwayAppServiceSpecs(projectConfig) {
  const configuredServices = projectConfig?.railway?.services;
  if (!Array.isArray(configuredServices) || configuredServices.length === 0) {
    return DEFAULT_RAILWAY_APP_SERVICE_SPECS.map((spec) => ({ ...spec, aliases: [...spec.aliases] }));
  }

  const specs = configuredServices.map((service, index) => normalizeRailwayAppServiceSpec(service, index));
  const seenKeys = new Set();
  for (const spec of specs) {
    if (seenKeys.has(spec.key)) {
      throw new Error(`Duplicate railway.services key \`${spec.key}\`.`);
    }
    seenKeys.add(spec.key);
  }

  return specs;
}

export function buildCreateRailwayServices(answers) {
  return DEFAULT_RAILWAY_APP_SERVICE_SPECS.filter((spec) => {
    if (spec.key === "landing") {
      return answers.includeLanding;
    }
    if (spec.key === "pwa") {
      return answers.includePwa;
    }
    return true;
  }).map((spec) => ({
    aliases: [...spec.aliases],
    baseName: spec.baseName,
    directory: spec.directory,
    dockerfile: spec.key === "worker" ? "api/Dockerfile" : `${spec.directory}/Dockerfile`,
    key: spec.key,
    seedImage: spec.key === "admin" || spec.key === "landing" || spec.key === "pwa" ? "nginx:1.29-alpine" : "alpine:3.22",
  }));
}

export function normalizeRailwayAppServiceSpec(input, index) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Invalid railway.services entry at index ${index}.`);
  }

  const key = slugify(String(input.key || "").trim());
  const directory = String(input.directory || "").trim().replace(/^\.\//, "").replace(/\/+$/g, "");
  const baseName = slugify(String(input.baseName || input.key || path.basename(directory) || "").trim());
  const aliases = [
    key,
    baseName,
    ...(Array.isArray(input.aliases) ? input.aliases : []),
  ]
    .map((value) => normalizeRailwayServiceName(value))
    .filter(Boolean);

  if (!key) {
    throw new Error("Each railway.services entry needs a non-empty `key`.");
  }
  if (!directory) {
    throw new Error(`Railway service \`${key}\` needs a non-empty \`directory\`.`);
  }
  if (!baseName) {
    throw new Error(`Railway service \`${key}\` needs a valid \`baseName\` or \`key\`.`);
  }

  return {
    aliases: [...new Set(aliases)],
    baseName,
    directory,
    dockerfile: String(input.dockerfile || "").trim() || null,
    key,
    seedImage: String(input.seedImage || (key === "admin" ? "nginx:1.29-alpine" : "alpine:3.22")).trim(),
    serviceName: String(input.serviceName || "").trim() || null,
  };
}

export function resolveRailwayServiceName(spec, projectSlug) {
  return spec.serviceName || buildRailwayAppServiceName(projectSlug, spec.baseName);
}

export function buildRailwayAppServiceName(projectSlug, baseName) {
  const normalizedSlug = slugify(projectSlug || "asaje-app");
  const normalizedBaseName = slugify(baseName);
  return `${normalizedSlug}-${normalizedBaseName}`;
}

export function findRailwayAppServiceSpec(appServiceSpecs, key) {
  const exact = appServiceSpecs.find((candidate) => candidate.key === key);
  if (exact) {
    return exact;
  }

  const defaultSpec = DEFAULT_RAILWAY_APP_SERVICE_SPECS.find((candidate) => candidate.key === key);
  if (!defaultSpec) {
    return null;
  }

  const defaultNames = [defaultSpec.key, defaultSpec.baseName, ...defaultSpec.aliases].map(normalizeRailwayServiceName);
  return appServiceSpecs.find((candidate) => {
    const names = [candidate.key, candidate.baseName, ...candidate.aliases].map(normalizeRailwayServiceName);
    return names.some((name) => defaultNames.includes(name));
  }) || null;
}

export function findRailwayServiceByKey(services, appServiceSpecs, manifest, key) {
  const spec = findRailwayAppServiceSpec(appServiceSpecs, key);
  if (!spec) {
    return null;
  }

  const preferredName = manifest.appServices?.[key]?.serviceName || resolveRailwayServiceName(spec, manifest.projectSlug);
  return findRailwayService(services, spec.aliases, preferredName);
}

export function findRailwayService(services, aliases, preferredName) {
  if (preferredName) {
    const exact = services.find(
      (service) => normalizeRailwayServiceName(service.name) === normalizeRailwayServiceName(preferredName),
    );
    if (exact) {
      return exact;
    }
  }

  const normalizedAliases = aliases.map(normalizeRailwayServiceName);
  return services.find((service) => {
    const normalizedName = normalizeRailwayServiceName(service.name);
    return normalizedAliases.some((alias) => normalizedName === alias || normalizedName.endsWith(`-${alias}`));
  });
}

export function normalizeRailwayServiceName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeRailwayServices(services) {
  const seen = new Set();
  const normalized = [];

  for (const service of services) {
    const name = pickFirstString([service.name, service.serviceName]);
    if (!name) {
      continue;
    }

    const id = pickFirstString([service.id, service.serviceId]);
    const key = `${normalizeRailwayServiceName(name)}:${id || ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({ id, name });
  }

  return normalized;
}

export function findCreatedRailwayService(config) {
  const beforeServices = normalizeRailwayServices(config.beforeServices);
  const afterServices = normalizeRailwayServices(config.servicesAfter);
  const beforeKeys = new Set(beforeServices.map(createRailwayServiceIdentity));
  const newServices = afterServices.filter((service) => !beforeKeys.has(createRailwayServiceIdentity(service)));

  if (newServices.length === 1) {
    return newServices[0];
  }

  const aliasMatch = findRailwayService(newServices, config.aliases, config.manifestServiceName);
  if (aliasMatch) {
    return aliasMatch;
  }

  return null;
}

export function updateRailwayManifestAppServices(manifest, services, appServiceSpecs, projectSlug) {
  manifest.appServices ||= {};

  for (const spec of appServiceSpecs) {
    const key = spec.key;
    const service = findRailwayService(
      services,
      spec.aliases,
      manifest.appServices[key]?.serviceName || resolveRailwayServiceName(spec, projectSlug || manifest.projectSlug),
    );
    if (!service?.name) {
      continue;
    }

    manifest.appServices[key] = {
      serviceId: service.id || manifest.appServices[key]?.serviceId || null,
      serviceName: service.name,
    };
  }
}

export function buildSyncedRailwayManifest(manifest, nextProjectConfig) {
  const nextManifest = {
    ...(manifest || {}),
    appServices: {},
    projectSlug: nextProjectConfig.projectSlug || manifest?.projectSlug || null,
    updatedAt: new Date().toISOString(),
  };

  const previousAppServices = manifest?.appServices || {};
  const existingSpecs = resolveRailwayAppServiceSpecs(nextProjectConfig);
  for (const spec of existingSpecs) {
    const previousEntry =
      previousAppServices[spec.key] ||
      findRailwayManifestAppServiceByName(previousAppServices, resolveRailwayServiceName(spec, nextManifest.projectSlug));

    nextManifest.appServices[spec.key] = {
      serviceId: previousEntry?.serviceId || null,
      serviceName: previousEntry?.serviceName || resolveRailwayServiceName(spec, nextManifest.projectSlug),
    };
  }

  return nextManifest;
}

export function findRailwayManifestAppServiceByName(appServices, serviceName) {
  return Object.values(appServices || {}).find(
    (entry) => normalizeRailwayServiceName(entry?.serviceName) === normalizeRailwayServiceName(serviceName),
  ) || null;
}

function createRailwayServiceIdentity(service) {
  if (service?.id) {
    return `id:${service.id}`;
  }

  return `name:${normalizeRailwayServiceName(service?.name)}`;
}

function pickFirstString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
