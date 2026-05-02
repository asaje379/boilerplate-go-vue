import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCreateAnswers } from "../src/create/answers.js";
import { collectCreateAnswers } from "../src/create/questions.js";

describe("create answer builder", () => {
  it("normalizes create answers", () => {
    const answers = buildCreateAnswers({
      adminEmail: "admin@example.com",
      adminName: "Admin",
      adminPassword: "password",
      adminPort: 5173,
      apiPort: 8080,
      appName: " My App ",
      branch: "main",
      bucketBasePath: "uploads",
      corsAllowedOrigins: "https://admin.example.com, https://pwa.example.com",
      defaultLocale: "fr",
      directory: "./My App",
      enableGithubWorkflow: true,
      includeLanding: true,
      includePwa: false,
      installDependencies: true,
      mailFromEmail: "no-reply@example.com",
      mailFromName: "My App",
      mailProvider: "mailchimp",
      mailchimpApiKey: "mailchimp-key",
      realtimePort: 8090,
      seedAdmin: true,
      seedUser: false,
      startInfra: false,
      storageProvider: "minio",
      swaggerUsername: "swagger",
      template: "org/repo",
      productionBranch: "main",
      stagingBranch: "develop",
    });

    assert.equal(answers.appName, "My App");
    assert.equal(answers.slug, "my-app");
    assert.equal(answers.databaseName, "my_app");
    assert.deepEqual(answers.corsAllowedOrigins, [
      "http://localhost:5173",
      "http://localhost:8088",
      "https://admin.example.com",
      "https://pwa.example.com",
    ]);
    assert.equal(answers.admin.email, "admin@example.com");
    assert.equal(answers.standardUser, null);
    assert.match(answers.jwtSecret, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(answers.github.branchEnvironments, [
      { branch: "main", environment: "production" },
      { branch: "develop", environment: "staging" },
    ]);
  });

  it("collects non-interactive create answers", async () => {
    const answers = await collectCreateAnswers({
      branch: "main",
      directory: "my-app",
      installDependencies: false,
      startInfra: false,
      template: "org/repo",
      yes: true,
    });

    assert.equal(answers.directory, "my-app");
    assert.equal(answers.appName, "My App");
    assert.equal(answers.installDependencies, false);
    assert.equal(answers.startInfra, false);
    assert.equal(answers.includeLanding, true);
    assert.equal(answers.includePwa, true);
  });
});
