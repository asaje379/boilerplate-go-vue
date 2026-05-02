import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isHttpUrl,
  resolveProjectSlug,
  shellEscape,
  slugify,
  splitCsv,
  titleize,
  uniqueStrings,
} from "../src/cli/strings.js";

describe("CLI string helpers", () => {
  it("splits CSV values", () => {
    assert.deepEqual(splitCsv(" api, admin,,pwa "), ["api", "admin", "pwa"]);
  });

  it("slugifies and titleizes values", () => {
    assert.equal(slugify(" My API_Service "), "my-api-service");
    assert.equal(titleize("my-api_service"), "My Api Service");
  });

  it("escapes shell arguments only when needed", () => {
    assert.equal(shellEscape("../my-app"), "../my-app");
    assert.equal(shellEscape("../my app"), '"../my app"');
  });

  it("detects HTTP URLs", () => {
    assert.equal(isHttpUrl("https://example.com"), true);
    assert.equal(isHttpUrl("ftp://example.com"), false);
    assert.equal(isHttpUrl("not a url"), false);
  });

  it("deduplicates strings", () => {
    assert.deepEqual(uniqueStrings([" api ", "api", "admin", ""]), ["api", "admin"]);
  });

  it("resolves project slugs", () => {
    assert.equal(resolveProjectSlug("/tmp/My App", {}), "my-app");
    assert.equal(resolveProjectSlug("/tmp/app", { projectName: "Admin Portal" }), "admin-portal");
    assert.equal(resolveProjectSlug("/tmp/app", { projectSlug: "custom-slug" }), "custom-slug");
  });
});
