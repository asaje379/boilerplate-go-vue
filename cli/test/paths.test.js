import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeRelativePath, splitCommaSeparatedPaths, uniquePaths } from "../src/cli/paths.js";

describe("CLI path helpers", () => {
  it("normalizes relative paths", () => {
    assert.equal(normalizeRelativePath(" ./admin/src/ "), "admin/src");
    assert.equal(normalizeRelativePath("api\\internal"), "api/internal");
    assert.equal(normalizeRelativePath(""), "");
  });

  it("splits comma-separated paths", () => {
    assert.deepEqual(splitCommaSeparatedPaths("./api, admin/, ,pwa\\src"), ["api", "admin", "pwa/src"]);
  });

  it("deduplicates normalized paths", () => {
    assert.deepEqual(uniquePaths(["./api", "api/", "admin"]), ["api", "admin"]);
  });
});
