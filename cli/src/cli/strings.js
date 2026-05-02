import crypto from "node:crypto";
import path from "node:path";

export function splitCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleize(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function randomSecret(bytes) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function shellEscape(value) {
  if (/^[a-zA-Z0-9_./-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

export function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

export function resolveProjectSlug(projectDir, projectConfig) {
  return slugify(projectConfig?.projectSlug || projectConfig?.projectName || path.basename(projectDir) || "asaje-app");
}
