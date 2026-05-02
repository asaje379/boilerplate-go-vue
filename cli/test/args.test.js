import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCreateArgs,
  parseDeployRailwayArgs,
  parseDestroyRailwayArgs,
  parseDirectoryArgs,
  parseSetupRailwayArgs,
  parseStartArgs,
  parseUpdateArgs,
} from "../src/cli/args.js";

describe("CLI argument parsers", () => {
  it("parses create options and defaults", () => {
    assert.deepEqual(
      parseCreateArgs([
        "my-app",
        "--yes",
        "--template=org/repo",
        "--branch",
        "feature",
        "--skip-install",
        "--start-infra",
      ]),
      {
        branch: "feature",
        directory: "my-app",
        installDependencies: false,
        startInfra: true,
        template: "org/repo",
        yes: true,
      },
    );
  });

  it("parses update includes as normalized unique paths", () => {
    assert.deepEqual(parseUpdateArgs([".", "--include", "./api,admin/", "--include=api\\internal", "--dry-run"]), {
      branch: undefined,
      directory: ".",
      dryRun: true,
      include: ["api", "admin", "api/internal"],
      template: undefined,
      yes: false,
    });
  });

  it("parses directory-only commands", () => {
    assert.deepEqual(parseDirectoryArgs([]), { directory: "." });
    assert.deepEqual(parseDirectoryArgs(["../app"]), { directory: "../app" });
  });

  it("parses setup Railway options", () => {
    assert.deepEqual(
      parseSetupRailwayArgs([
        "../app",
        "--yes",
        "--dry-run",
        "--diff",
        "--bucket",
        "assets",
        "--environment=production",
        "--service",
        "api",
        "--services=admin,api",
      ]),
      {
        bucket: "assets",
        bucketProvided: true,
        diff: true,
        directory: "../app",
        dryRun: true,
        environment: "production",
        services: ["api", "admin"],
        yes: true,
      },
    );
  });

  it("parses deploy Railway options", () => {
    assert.deepEqual(parseDeployRailwayArgs(["../app", "-y", "-e", "staging", "--services", "api, admin", "--service=pwa"]), {
      directory: "../app",
      dryRun: false,
      environment: "staging",
      services: ["api", "admin", "pwa"],
      yes: true,
    });
  });

  it("parses and validates destroy Railway options", () => {
    assert.deepEqual(parseDestroyRailwayArgs(["../app", "--scope=project", "--2fa-code", "123456", "--dry-run"]), {
      directory: "../app",
      dryRun: true,
      environment: undefined,
      scope: "project",
      twoFactorCode: "123456",
      yes: false,
    });

    assert.throws(() => parseDestroyRailwayArgs(["--scope=service"]), /--scope must be either 'environment' or 'project'/);
  });

  it("parses start options", () => {
    assert.deepEqual(parseStartArgs(["../app", "--yes", "--profile=api", "--install", "--skip-infra", "--skip-admin"]), {
      admin: false,
      directory: "../app",
      installDependencies: true,
      profile: "api",
      startInfra: false,
      yes: true,
    });
  });
});
