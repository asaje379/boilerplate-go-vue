import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectMakefileContent } from "../src/project/makefile.js";

describe("project Makefile helper", () => {
  it("builds a Makefile using selected ports", () => {
    const content = buildProjectMakefileContent({
      adminPort: 3000,
      apiPort: 9000,
      includeLanding: true,
      includePwa: true,
      landingPort: 3001,
      pwaPort: 3002,
      realtimePort: 9001,
    });

    assert.match(content, /ADMIN_PORT := 3000/);
    assert.match(content, /API_PORT := 9000/);
    assert.match(content, /REALTIME_PORT := 9001/);
    assert.match(content, /LANDING_PORT := 3001/);
    assert.match(content, /PWA_PORT := 3002/);
    assert.match(content, /cd admin && pnpm dev --host 0\.0\.0\.0 --port \$\(ADMIN_PORT\)/);
    assert.match(content, /cd api && PORT=\$\(API_PORT\) go run \. serve/);
    assert.match(content, /^dev: ## Start all services in foreground with prefixed logs/m);
    assert.match(content, /^dev-bg: ## Start all services in background and write logs to \/tmp/m);
    assert.match(content, /^stop: ## Stop background dev services and clear logs/m);
    assert.match(content, /^logs: ## Stream logs/m);
    assert.match(content, /^logs-all: ## Show last 100 lines from all background logs/m);
    assert.match(content, /API Server:   http:\/\/localhost:\$\(API_PORT\)/);
    assert.match(content, /pkill -f "vite\.\*\$\(ADMIN_PORT\)"/);
    assert.match(content, /landing: ## Start the landing surface only/);
    assert.match(content, /pwa: ## Start the PWA surface only/);
    assert.match(content, /logs-landing: ## Stream landing logs/);
    assert.match(content, /logs-pwa: ## Stream PWA logs/);
  });

  it("omits optional targets for disabled surfaces", () => {
    const content = buildProjectMakefileContent({
      adminPort: 5173,
      apiPort: 8080,
      includeLanding: false,
      includePwa: false,
      realtimePort: 8090,
    });

    assert.doesNotMatch(content, /^landing:/m);
    assert.doesNotMatch(content, /^pwa:/m);
    assert.doesNotMatch(content, /^logs-landing:/m);
    assert.doesNotMatch(content, /^logs-pwa:/m);
  });
});
