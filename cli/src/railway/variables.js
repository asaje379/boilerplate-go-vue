export function assignManagedRailwayServiceVariables(registryEntry, variables, variablesMode) {
  if (!registryEntry || !registryEntry.name) {
    return;
  }

  const nextVariables = {};
  const existingVariables = registryEntry.existingVariables || {};

  for (const [key, value] of Object.entries(variables || {})) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }

    if (key === "CORS_ALLOWED_ORIGINS" && Object.prototype.hasOwnProperty.call(existingVariables, key)) {
      nextVariables[key] = mergeCsvValues(existingVariables[key], value);
      continue;
    }

    if (variablesMode === "preserve-remote" && Object.prototype.hasOwnProperty.call(existingVariables, key)) {
      nextVariables[key] = existingVariables[key];
      continue;
    }

    nextVariables[key] = value;
  }

  mergeRailwayServiceVariables(registryEntry, nextVariables);
}

export function buildRailwayBrowserOrigins(appServices) {
  return [appServices.admin, appServices.landing, appServices.pwa]
    .filter((service) => service?.name)
    .map((service) => `https://${railwayReference(service.name, "RAILWAY_PUBLIC_DOMAIN")}`)
    .join(",");
}

export function mergeCsvValues(...values) {
  return [...new Set(values.flatMap((value) => splitCsv(String(value || ""))))].join(",");
}

export function buildRailwayVariableDiff(currentVariables, nextVariables, options = {}) {
  const changes = [];
  const includeRemoved = options.includeRemoved ?? true;
  const keys = [...new Set([...Object.keys(nextVariables || {}), ...(includeRemoved ? Object.keys(currentVariables || {}) : [])])].sort();
  for (const key of keys) {
    const rawCurrent = currentVariables?.[key];
    const rawNext = nextVariables?.[key];
    const currentValue = typeof rawCurrent === "string" ? rawCurrent : rawCurrent === undefined || rawCurrent === null ? undefined : String(rawCurrent);
    const nextValue = typeof rawNext === "string" ? rawNext : rawNext === undefined || rawNext === null ? undefined : String(rawNext);
    if (nextValue === undefined && currentValue === undefined) {
      continue;
    }

    let status = "unchanged";
    if (currentValue === undefined) {
      status = "added";
    } else if (nextValue === undefined) {
      status = "removed";
    } else if (currentValue !== nextValue) {
      status = "changed";
    }

    changes.push({ currentValue, key, nextValue, status });
  }

  return {
    added: changes.filter((item) => item.status === "added"),
    changed: changes.filter((item) => item.status === "changed"),
    removed: changes.filter((item) => item.status === "removed"),
    unchanged: changes.filter((item) => item.status === "unchanged"),
  };
}

export function sanitizeVariablesForOutput(variables, showSecrets = false) {
  const sanitized = {};
  for (const [key, value] of Object.entries(variables)) {
    sanitized[key] = formatRailwayVariableValue(key, value, showSecrets);
  }
  return sanitized;
}

export function formatRailwayVariableValue(key, value, showSecrets = false) {
  if (value === undefined) {
    return "<unset>";
  }

  const normalizedKey = String(key || "").toUpperCase();
  if (!showSecrets && /(SECRET|PASSWORD|TOKEN|API_KEY|ACCESS_KEY|SECRET_KEY|ERLANG_COOKIE)/.test(normalizedKey)) {
    return redactRailwayVariableValue(value);
  }

  return String(value);
}

export function redactRailwayVariableValue(value) {
  const textValue = String(value || "");
  if (textValue.length <= 8) {
    return "[redacted]";
  }
  return `${textValue.slice(0, 3)}...[redacted]...${textValue.slice(-2)}`;
}

function mergeRailwayServiceVariables(registryEntry, variables) {
  registryEntry.variables = {
    ...(registryEntry.variables || {}),
    ...variables,
  };
}

function railwayReference(serviceName, variableName) {
  return "${{ " + serviceName + "." + variableName + " }}";
}

function splitCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
