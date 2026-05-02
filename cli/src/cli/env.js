import fs from "fs-extra";

export async function readEnvFile(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  return parseEnvContent(contents);
}

export async function tryReadEnvFile(filePath) {
  if (!(await fs.pathExists(filePath))) {
    return {};
  }

  return readEnvFile(filePath);
}

export function parseEnvContent(contents) {
  const result = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

export function toEnvContent(values) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${escapeEnvValue(String(value))}`)
    .join("\n")}\n`;
}

export function escapeEnvValue(value) {
  if (value === "") {
    return "";
  }

  if (/\s|#|"/.test(value)) {
    return JSON.stringify(value);
  }

  return value;
}
