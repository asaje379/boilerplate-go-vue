import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignManagedRailwayServiceVariables,
  buildRailwayVariableDiff,
  buildRailwayBrowserOrigins,
  formatRailwayVariableValue,
  mergeCsvValues,
  sanitizeVariablesForOutput,
} from "../src/railway/variables.js";

describe("Railway variable helpers", () => {
  it("builds browser CORS origins for all public frontend services", () => {
    const origins = buildRailwayBrowserOrigins({
      admin: { name: "my-admin" },
      landing: { name: "my-landing" },
      pwa: { name: "my-pwa" },
    });

    assert.equal(
      origins,
      "https://${{ my-admin.RAILWAY_PUBLIC_DOMAIN }},https://${{ my-landing.RAILWAY_PUBLIC_DOMAIN }},https://${{ my-pwa.RAILWAY_PUBLIC_DOMAIN }}",
    );
  });

  it("omits missing frontend services from browser origins", () => {
    const origins = buildRailwayBrowserOrigins({
      admin: { name: "my-admin" },
      landing: null,
      pwa: undefined,
    });

    assert.equal(origins, "https://${{ my-admin.RAILWAY_PUBLIC_DOMAIN }}");
  });

  it("merges CSV values without duplicates", () => {
    assert.equal(mergeCsvValues("https://admin.app, https://pwa.app", "https://pwa.app,https://landing.app"), "https://admin.app,https://pwa.app,https://landing.app");
  });

  it("preserves remote variables but merges CORS origins", () => {
    const registryEntry = {
      existingVariables: {
        CORS_ALLOWED_ORIGINS: "https://custom.app,https://admin.app",
        JWT_SECRET: "remote-secret",
      },
      name: "api",
      variables: {},
    };

    assignManagedRailwayServiceVariables(
      registryEntry,
      {
        CORS_ALLOWED_ORIGINS: "https://admin.app,https://pwa.app",
        JWT_SECRET: "managed-secret",
      },
      "preserve-remote",
    );

    assert.deepEqual(registryEntry.variables, {
      CORS_ALLOWED_ORIGINS: "https://custom.app,https://admin.app,https://pwa.app",
      JWT_SECRET: "remote-secret",
    });
  });

  it("merges CORS origins in sync-managed mode", () => {
    const registryEntry = {
      existingVariables: {
        CORS_ALLOWED_ORIGINS: "https://custom.app",
      },
      name: "realtime-gateway",
      variables: {},
    };

    assignManagedRailwayServiceVariables(
      registryEntry,
      {
        CORS_ALLOWED_ORIGINS: "https://admin.app,https://landing.app",
      },
      "sync-managed",
    );

    assert.deepEqual(registryEntry.variables, {
      CORS_ALLOWED_ORIGINS: "https://custom.app,https://admin.app,https://landing.app",
    });
  });

  it("builds sorted variable diffs", () => {
    assert.deepEqual(buildRailwayVariableDiff({ A: "1", B: "2", D: "4" }, { A: "1", B: "3", C: "4" }), {
      added: [{ currentValue: undefined, key: "C", nextValue: "4", status: "added" }],
      changed: [{ currentValue: "2", key: "B", nextValue: "3", status: "changed" }],
      removed: [{ currentValue: "4", key: "D", nextValue: undefined, status: "removed" }],
      unchanged: [{ currentValue: "1", key: "A", nextValue: "1", status: "unchanged" }],
    });
  });

  it("redacts secret values unless explicitly shown", () => {
    assert.equal(formatRailwayVariableValue("JWT_SECRET", "super-secret-value"), "sup...[redacted]...ue");
    assert.equal(formatRailwayVariableValue("JWT_SECRET", "super-secret-value", true), "super-secret-value");
    assert.deepEqual(sanitizeVariablesForOutput({ API_KEY: "abcd", PORT: "8080" }), {
      API_KEY: "[redacted]",
      PORT: "8080",
    });
  });
});
