import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchRailwayProjectServices, getRailwayApiAuth } from "../src/railway/client.js";

describe("Railway client helpers", () => {
  it("builds auth headers from Railway API token", () => {
    assert.deepEqual(getRailwayApiAuth({ RAILWAY_API_TOKEN: "token" }), {
      headers: {
        Authorization: "Bearer token",
      },
    });
  });

  it("builds auth headers from project token", () => {
    assert.deepEqual(getRailwayApiAuth({ RAILWAY_TOKEN: "token" }), {
      headers: {
        "Project-Access-Token": "token",
      },
    });
  });

  it("returns no services without auth or project", async () => {
    assert.deepEqual(await fetchRailwayProjectServices("project", { env: {} }), []);
    assert.deepEqual(await fetchRailwayProjectServices("", { env: { RAILWAY_API_TOKEN: "token" } }), []);
  });

  it("fetches and normalizes project services", async () => {
    const calls = [];
    const services = await fetchRailwayProjectServices("project", {
      env: { RAILWAY_API_TOKEN: "token" },
      fetchImpl: async (url, init) => {
        calls.push({ init, url });
        return {
          ok: true,
          async json() {
            return {
              data: {
                project: {
                  services: {
                    edges: [
                      { node: { icon: "go", id: "svc_api", name: "api" } },
                      { node: { id: 123, name: null } },
                    ],
                  },
                },
              },
            };
          },
        };
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, "POST");
    assert.deepEqual(services, [
      { icon: "go", id: "svc_api", name: "api" },
      { icon: null, id: null, name: null },
    ]);
  });
});
