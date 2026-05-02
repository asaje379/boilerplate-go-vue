import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runCliCommand } from "../src/cli/runner.js";

describe("CLI command runner", () => {
  it("routes commands and returns completion messages", async () => {
    const calls = [];
    const runners = buildRunners(calls);

    assert.equal(await runCliCommand({ argv: ["."], command: "start" }, runners), "Services stopped.");
    assert.deepEqual(calls, [{ argv: ["."], name: "runStart" }]);
  });

  it("routes help without argv runner", async () => {
    const calls = [];
    const runners = buildRunners(calls);

    assert.equal(await runCliCommand({ argv: [], command: "help" }, runners), "Ready.");
    assert.deepEqual(calls, [{ name: "printHelp" }]);
  });

  it("defaults unknown commands to create", async () => {
    const calls = [];
    const runners = buildRunners(calls);

    assert.equal(await runCliCommand({ argv: ["my-app"], command: "unknown" }, runners), "Project ready.");
    assert.deepEqual(calls, [{ argv: ["my-app"], name: "runCreate" }]);
  });
});

function buildRunners(calls) {
  const runnerNames = [
    "runCreate",
    "runDeployRailway",
    "runDestroyRailway",
    "runDiffRailwayConfig",
    "runDoctor",
    "runExportRailwayConfig",
    "runImportRailwayConfig",
    "runPrintRailwayConfig",
    "runPublish",
    "runSetupRailway",
    "runStart",
    "runSyncGithubWorkflow",
    "runSyncProjectConfig",
    "runSyncRailwayEnv",
    "runSyncReadme",
    "runUpdate",
    "runUpdateRailway",
  ];

  return {
    printHelp() {
      calls.push({ name: "printHelp" });
    },
    ...Object.fromEntries(runnerNames.map((name) => [name, async (argv) => calls.push({ argv, name })])),
  };
}
