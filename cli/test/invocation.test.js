import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveInvocation } from "../src/cli/invocation.js";

describe("resolveInvocation", () => {
  it("defaults create-asaje-go-vue to create", () => {
    assert.deepEqual(resolveInvocation(["node", "create-asaje-go-vue", "my-app"]), {
      argv: ["my-app"],
      command: "create",
      title: "create-asaje-go-vue",
    });
  });

  it("routes asaje commands with command title", () => {
    assert.deepEqual(resolveInvocation(["node", "asaje", "sync-railway-env", ".", "--dry-run"]), {
      argv: [".", "--dry-run"],
      command: "sync-railway-env",
      title: "asaje sync-railway-env",
    });
  });

  it("routes asaje create explicitly", () => {
    assert.deepEqual(resolveInvocation(["node", "asaje", "create", "my-app"]), {
      argv: ["my-app"],
      command: "create",
      title: "asaje create",
    });
  });

  it("shows asaje help for missing or unknown commands", () => {
    assert.deepEqual(resolveInvocation(["node", "asaje"]), {
      argv: [],
      command: "help",
      title: "asaje",
    });
    assert.deepEqual(resolveInvocation(["node", "asaje", "unknown"]), {
      argv: [],
      command: "help",
      title: "asaje",
    });
  });

  it("routes help flags for both binaries", () => {
    assert.deepEqual(resolveInvocation(["node", "create-asaje-go-vue.js", "--help"]), {
      argv: [],
      command: "help",
      title: "create-asaje-go-vue",
    });
  });
});
