import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSelectedServices, collectStartAnswers, inferProfileFromArgs, profileToServices } from "../src/start/answers.js";

describe("start answer helpers", () => {
  it("maps startup profiles to services", () => {
    assert.deepEqual(profileToServices("full"), ["api", "worker", "realtime", "admin", "landing", "pwa"]);
    assert.deepEqual(profileToServices("backend-only"), ["api", "worker", "realtime"]);
    assert.deepEqual(profileToServices("frontend-only"), ["admin", "landing", "pwa"]);
    assert.deepEqual(profileToServices("custom"), []);
  });

  it("infers profile from service flags", () => {
    assert.equal(inferProfileFromArgs({}), "full");
    assert.equal(inferProfileFromArgs({ admin: false, landing: false, pwa: false }), "backend-only");
    assert.equal(inferProfileFromArgs({ api: false, worker: false, realtime: false }), "frontend-only");
    assert.equal(inferProfileFromArgs({ pwa: false }), undefined);
  });

  it("builds selected services with overrides", () => {
    assert.deepEqual(buildSelectedServices({ profile: "full", pwa: false }), ["api", "worker", "realtime", "admin", "landing"]);
  });

  it("collects non-interactive start answers", async () => {
    assert.deepEqual(await collectStartAnswers({ directory: ".", landing: false, yes: true }), {
      directory: ".",
      installDependencies: false,
      profile: "full",
      selectedServices: ["api", "worker", "realtime", "admin", "pwa"],
      startInfra: true,
    });
  });
});
