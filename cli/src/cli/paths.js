export function splitCommaSeparatedPaths(value) {
  return value
    .split(",")
    .map((entry) => normalizeRelativePath(entry))
    .filter(Boolean);
}

export function uniquePaths(paths) {
  return [...new Set(paths.map((entry) => normalizeRelativePath(entry)).filter(Boolean))];
}

export function normalizeRelativePath(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/^\.\//, "").replace(/\\/g, "/").replace(/\/$/, "");
}
