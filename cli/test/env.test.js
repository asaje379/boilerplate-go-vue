import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeEnvValue, parseEnvContent, toEnvContent } from "../src/cli/env.js";

describe("CLI env helpers", () => {
  it("parses env content", () => {
    assert.deepEqual(parseEnvContent(`
# comment
PORT=8080
EMPTY=
QUOTED="hello world"
SINGLE='value'
INVALID
`), {
      EMPTY: "",
      PORT: "8080",
      QUOTED: "hello world",
      SINGLE: "value",
    });
  });

  it("escapes env values", () => {
    assert.equal(escapeEnvValue(""), "");
    assert.equal(escapeEnvValue("simple"), "simple");
    assert.equal(escapeEnvValue("hello world"), '"hello world"');
    assert.equal(escapeEnvValue("value#tag"), '"value#tag"');
  });

  it("serializes env content", () => {
    assert.equal(toEnvContent({ APP_NAME: "My App", PORT: "8080" }), 'APP_NAME="My App"\nPORT=8080\n');
  });
});
