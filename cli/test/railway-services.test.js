import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_RAILWAY_APP_SERVICE_SPECS,
  buildCreateRailwayServices,
  buildSyncedRailwayManifest,
  findCreatedRailwayService,
  findRailwayService,
  normalizeRailwayServiceName,
  normalizeRailwayServices,
  resolveRailwayAppServiceSpecs,
  resolveRailwayServiceName,
  updateRailwayManifestAppServices,
} from "../src/railway/services.js";

describe("Railway service helpers", () => {
  it("returns cloned default app service specs", () => {
    const specs = resolveRailwayAppServiceSpecs({});

    assert.deepEqual(specs, DEFAULT_RAILWAY_APP_SERVICE_SPECS);
    assert.notEqual(specs, DEFAULT_RAILWAY_APP_SERVICE_SPECS);
    assert.notEqual(specs[0].aliases, DEFAULT_RAILWAY_APP_SERVICE_SPECS[0].aliases);
  });

  it("builds create-time Railway services from selected surfaces", () => {
    assert.deepEqual(buildCreateRailwayServices({ includeLanding: false, includePwa: true }).map((spec) => spec.key), [
      "api",
      "worker",
      "admin",
      "realtime",
      "pwa",
    ]);

    const pwa = buildCreateRailwayServices({ includeLanding: false, includePwa: true }).find((spec) => spec.key === "pwa");
    assert.equal(pwa.seedImage, "nginx:1.29-alpine");
  });

  it("normalizes configured app service specs", () => {
    assert.deepEqual(
      resolveRailwayAppServiceSpecs({
        railway: {
          services: [
            {
              aliases: ["Admin Web", "admin"],
              directory: "./admin/",
              key: "Admin Web",
            },
          ],
        },
      }),
      [
        {
          aliases: ["admin-web", "admin"],
          baseName: "admin-web",
          directory: "admin",
          dockerfile: null,
          key: "admin-web",
          seedImage: "alpine:3.22",
          serviceName: null,
        },
      ],
    );
  });

  it("rejects duplicate service keys", () => {
    assert.throws(
      () => resolveRailwayAppServiceSpecs({
        railway: {
          services: [
            { directory: "api", key: "api" },
            { directory: "backend", key: "API" },
          ],
        },
      }),
      /Duplicate railway.services key `api`/,
    );
  });

  it("matches services by preferred name before aliases", () => {
    const services = [
      { id: "svc_admin", name: "my-admin" },
      { id: "svc_api", name: "my-api" },
    ];

    assert.deepEqual(findRailwayService(services, ["api"], "my-admin"), services[0]);
  });

  it("normalizes services and detects created service deterministically", () => {
    assert.deepEqual(normalizeRailwayServices([
      { id: "svc_api", name: " API " },
      { id: "svc_api", name: "api" },
      { serviceId: "svc_admin", serviceName: "admin" },
      { name: "" },
    ]), [
      { id: "svc_api", name: "API" },
      { id: "svc_admin", name: "admin" },
    ]);

    assert.deepEqual(findCreatedRailwayService({
      aliases: ["admin"],
      beforeServices: [{ id: "svc_api", name: "api" }],
      servicesAfter: [
        { id: "svc_api", name: "api" },
        { id: "svc_admin", name: "admin" },
      ],
    }), { id: "svc_admin", name: "admin" });
  });

  it("updates known manifest services while preserving unknown services", () => {
    const manifest = {
      appServices: {
        custom: { serviceId: "svc_custom", serviceName: "custom-service" },
      },
      projectSlug: "my-app",
    };
    const specs = [{ aliases: ["api"], baseName: "api", key: "api", serviceName: null }];

    updateRailwayManifestAppServices(manifest, [{ id: "svc_api", name: "my-app-api" }], specs, "my-app");

    assert.deepEqual(manifest.appServices, {
      api: { serviceId: "svc_api", serviceName: "my-app-api" },
      custom: { serviceId: "svc_custom", serviceName: "custom-service" },
    });
  });

  it("builds synced manifest from project config deterministically", () => {
    const manifest = {
      appServices: {
        api: { serviceId: "svc_old", serviceName: "old-api" },
      },
      projectSlug: "old-slug",
      resources: { postgres: { status: "existing" } },
    };
    const nextConfig = {
      projectSlug: "next-slug",
      railway: {
        services: [
          { baseName: "api", directory: "api", key: "api" },
          { baseName: "admin", directory: "admin", key: "admin" },
        ],
      },
    };

    const nextManifest = buildSyncedRailwayManifest(manifest, nextConfig);

    assert.equal(nextManifest.projectSlug, "next-slug");
    assert.deepEqual(nextManifest.resources, manifest.resources);
    assert.deepEqual(nextManifest.appServices, {
      admin: { serviceId: null, serviceName: "next-slug-admin" },
      api: { serviceId: "svc_old", serviceName: "old-api" },
    });
    assert.match(nextManifest.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("normalizes names and resolves service names", () => {
    assert.equal(normalizeRailwayServiceName(" My API_Service "), "my-api-service");
    assert.equal(resolveRailwayServiceName({ baseName: "api", serviceName: "custom-api" }, "app"), "custom-api");
    assert.equal(resolveRailwayServiceName({ baseName: "api", serviceName: null }, "My App"), "my-app-api");
  });
});
