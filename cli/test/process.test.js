import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { checkCommand, createManagedProcess, prefixChunk, runCommand } from "../src/cli/process.js";

describe("CLI process helpers", () => {
  it("runs commands with inherited stdio", async () => {
    const calls = [];
    await runCommand("npm", ["run", "check"], "/tmp/app", {
      execaImpl: async (...args) => calls.push(args),
    });

    assert.deepEqual(calls, [["npm", ["run", "check"], { cwd: "/tmp/app", stdio: "inherit" }]]);
  });

  it("checks command availability", async () => {
    assert.deepEqual(await checkCommand({ args: ["--version"], command: "node", name: "node" }, {
      execaImpl: async () => ({ exitCode: 0, stdout: "v22.0.0\nextra" }),
    }), { message: "node detected (v22.0.0)", ok: true });

    assert.deepEqual(await checkCommand({ args: [], command: "missing", name: "missing" }, {
      execaImpl: async () => ({ exitCode: 1, stdout: "" }),
    }), { message: "missing unavailable", ok: false });
  });

  it("prefixes output chunks", () => {
    assert.equal(prefixChunk("[api] ", Buffer.from("one\ntwo")), "[api] one\n[api] two");
  });

  it("creates managed processes with prefixed streams", async () => {
    const stdoutEmitter = new EventEmitter();
    const stderrEmitter = new EventEmitter();
    const child = Promise.resolve({ exitCode: 0 });
    child.stdout = stdoutEmitter;
    child.stderr = stderrEmitter;
    child.kill = (...args) => calls.push({ kill: args });
    const calls = [];
    const output = [];

    const managed = createManagedProcess({
      args: ["dev"],
      color: (value) => value,
      command: "pnpm",
      cwd: "/tmp/app/admin",
      name: "admin",
    }, {
      execaImpl: (...args) => {
        calls.push(args);
        return child;
      },
      stdout: { write: (value) => output.push(value) },
      stderr: { write: (value) => output.push(value) },
    });

    stdoutEmitter.emit("data", Buffer.from("ready"));
    stderrEmitter.emit("data", Buffer.from("warn"));

    assert.deepEqual(calls[0], ["pnpm", ["dev"], { cwd: "/tmp/app/admin", stderr: "pipe", stdout: "pipe" }]);
    assert.deepEqual(output, ["[admin] ready", "[admin] warn"]);
    assert.deepEqual(await managed, { exitCode: 0, name: "admin" });
    managed.kill("SIGTERM");
    assert.deepEqual(calls[1], { kill: ["SIGTERM"] });
  });
});
