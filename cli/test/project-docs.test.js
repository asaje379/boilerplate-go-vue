import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGithubWorkflowContent,
  buildProjectReadmeContent,
  buildReadmeAnswersFromProjectConfig,
  getGithubActionsDeployConfig,
} from "../src/project/docs.js";

describe("project document helpers", () => {
  it("builds README content from create answers", () => {
    const content = buildProjectReadmeContent({
      adminPort: 5173,
      apiPort: 8080,
      appName: "My App",
      github: { enabled: false, branchEnvironments: [] },
      includeLanding: true,
      includePwa: false,
      landingPort: 3001,
      realtimePort: 8090,
      storageProvider: "minio",
    });

    assert.match(content, /^# My App/);
    assert.match(content, /- `landing\/`: optional public marketing surface/);
    assert.doesNotMatch(content, /- `pwa\/`/);
    assert.match(content, /## Makefile Commands/);
    assert.match(content, /`ADMIN_PORT=5173`/);
    assert.match(content, /`LANDING_PORT=3001`/);
    assert.match(content, /`make dev`: start all services in foreground with prefixed logs/);
    assert.match(content, /`make logs`: stream all background logs/);
    assert.match(content, /`make stop`: stop background dev services and clear logs/);
    assert.match(content, /`make start`: start the configured project through `asaje start`/);
  });

  it("normalizes GitHub deploy config", () => {
    assert.deepEqual(getGithubActionsDeployConfig({
      ci: {
        githubActions: {
          deployRailway: {
            branchEnvironments: [
              { branch: "main", environment: "production" },
              { branch: "main", environment: "duplicate" },
              { branch: "", environment: "staging" },
            ],
            enabled: true,
          },
        },
      },
    }), {
      branchEnvironments: [{ branch: "main", environment: "production" }],
      enabled: true,
    });
  });

  it("builds README answers from project config", () => {
    assert.deepEqual(buildReadmeAnswersFromProjectConfig("/tmp/app", {
      ports: { admin: 3000, api: 9000, landing: 3001, pwa: 3002, realtime: 9001 },
      projectName: "Configured App",
      railway: { services: [{ directory: "landing", key: "landing" }] },
      services: { storageProvider: "aws" },
    }), {
      adminPort: 3000,
      apiPort: 9000,
      appName: "Configured App",
      github: { branchEnvironments: [], enabled: false },
      includeLanding: true,
      includePwa: false,
      landingPort: 3001,
      pwaPort: 3002,
      realtimePort: 9001,
      storageProvider: "aws",
    });
  });

  it("builds workflow with selected optional surfaces", () => {
    const content = buildGithubWorkflowContent({
      github: { branchEnvironments: [{ branch: "main", environment: "production" }] },
      includeLanding: true,
      includePwa: false,
    });

    assert.match(content, /branches:\n      - main/);
    assert.match(content, /main\) echo "environment=production"/);
    assert.match(content, /Deploy landing/);
    assert.doesNotMatch(content, /Deploy pwa/);
  });
});
