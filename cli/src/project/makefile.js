export function buildProjectMakefileContent(answers) {
  const landingTargets = answers.includeLanding
    ? `
landing: ## Start the landing surface only
	cd landing && pnpm dev --host 0.0.0.0 --port $(LANDING_PORT)

logs-landing: ## Stream landing logs
	@tail -f /tmp/$(PROJECT_NAME)-landing.log 2>/dev/null || echo "Landing not started"
`
    : "";
  const pwaTargets = answers.includePwa
    ? `
pwa: ## Start the PWA surface only
	cd pwa && pnpm dev --host 0.0.0.0 --port $(PWA_PORT)

logs-pwa: ## Stream PWA logs
	@tail -f /tmp/$(PROJECT_NAME)-pwa.log 2>/dev/null || echo "PWA not started"
`
    : "";
  const landingDev = answers.includeLanding
    ? ` && \
	(cd landing && pnpm dev --host 0.0.0.0 --port $(LANDING_PORT) 2>&1 | sed 's/^/[LANDING] /' &)`
    : "";
  const pwaDev = answers.includePwa
    ? ` && \
	(cd pwa && pnpm dev --host 0.0.0.0 --port $(PWA_PORT) 2>&1 | sed 's/^/[PWA] /' &)`
    : "";
  const landingDevBg = answers.includeLanding
    ? `
	@(cd landing && pnpm dev --host 0.0.0.0 --port $(LANDING_PORT) > /tmp/$(PROJECT_NAME)-landing.log 2>&1 &)`
    : "";
  const pwaDevBg = answers.includePwa
    ? `
	@(cd pwa && pnpm dev --host 0.0.0.0 --port $(PWA_PORT) > /tmp/$(PROJECT_NAME)-pwa.log 2>&1 &)`
    : "";
  const landingServiceLine = answers.includeLanding
    ? `
	@echo "  Landing:      http://localhost:$(LANDING_PORT)  (logs: /tmp/$(PROJECT_NAME)-landing.log)"`
    : "";
  const pwaServiceLine = answers.includePwa
    ? `
	@echo "  PWA:          http://localhost:$(PWA_PORT)  (logs: /tmp/$(PROJECT_NAME)-pwa.log)"`
    : "";
  const landingLogsAll = answers.includeLanding
    ? `
	@echo ""
	@echo "=== Landing ===" && tail -100 /tmp/$(PROJECT_NAME)-landing.log 2>/dev/null || echo "No logs yet"`
    : "";
  const pwaLogsAll = answers.includePwa
    ? `
	@echo ""
	@echo "=== PWA ===" && tail -100 /tmp/$(PROJECT_NAME)-pwa.log 2>/dev/null || echo "No logs yet"`
    : "";
  const landingStop = answers.includeLanding ? `
	@-pkill -f "vite.*$(LANDING_PORT)" 2>/dev/null || true` : "";
  const pwaStop = answers.includePwa ? `
	@-pkill -f "vite.*$(PWA_PORT)" 2>/dev/null || true` : "";

  return `.DEFAULT_GOAL := help

PROJECT_NAME := $(shell basename $(CURDIR))
ADMIN_PORT := ${answers.adminPort}
API_PORT := ${answers.apiPort}
REALTIME_PORT := ${answers.realtimePort}
LANDING_PORT := ${answers.landingPort || 8088}
PWA_PORT := ${answers.pwaPort || 4174}

.PHONY: help install infra infra-up infra-stop infra-down dev dev-bg start stop logs logs-all logs-api logs-worker logs-realtime logs-admin logs-landing logs-pwa doctor update sync-config sync-readme sync-workflow api api-server worker api-worker realtime admin landing pwa test type-check build

help: ## Show available make targets
	@awk 'BEGIN {FS = ":.*##"; printf "Available targets:\\n"} /^[a-zA-Z0-9_-]+:.*##/ { printf "  %-18s %s\\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install frontend dependencies and download Go modules
	pnpm --dir admin install
	@if [ -f landing/package.json ]; then pnpm --dir landing install; fi
	@if [ -f pwa/package.json ]; then pnpm --dir pwa install; fi
	cd api && go mod download
	cd realtime-gateway && go mod download

dev: ## Start all services in foreground with prefixed logs
	@echo "Starting $(PROJECT_NAME) services..."
	@echo "Use Ctrl+C to stop all services"
	@trap 'echo ""; echo "Stopping services..."; $(MAKE) stop' INT; \
	(cd api && PORT=$(API_PORT) go run . serve 2>&1 | sed 's/^/[API] /' &) && \
	(cd api && go run . worker 2>&1 | sed 's/^/[WORKER] /' &) && \
	(cd realtime-gateway && PORT=$(REALTIME_PORT) go run . 2>&1 | sed 's/^/[REALTIME] /' &) && \
	(cd admin && pnpm dev --host 0.0.0.0 --port $(ADMIN_PORT) 2>&1 | sed 's/^/[ADMIN] /' &)${landingDev}${pwaDev} && \
	wait

dev-bg: ## Start all services in background and write logs to /tmp
	@echo "Starting $(PROJECT_NAME) services in background..."
	@echo "Logs will be written to /tmp/$(PROJECT_NAME)-*.log"
	@(cd api && PORT=$(API_PORT) go run . serve > /tmp/$(PROJECT_NAME)-api-server.log 2>&1 &)
	@(cd api && go run . worker > /tmp/$(PROJECT_NAME)-api-worker.log 2>&1 &)
	@(cd realtime-gateway && PORT=$(REALTIME_PORT) go run . > /tmp/$(PROJECT_NAME)-realtime.log 2>&1 &)
	@(cd admin && pnpm dev --host 0.0.0.0 --port $(ADMIN_PORT) > /tmp/$(PROJECT_NAME)-admin.log 2>&1 &)${landingDevBg}${pwaDevBg}
	@echo "All services started!"
	@echo ""
	@echo "Services:"
	@echo "  API Server:   http://localhost:$(API_PORT)  (logs: /tmp/$(PROJECT_NAME)-api-server.log)"
	@echo "  API Worker:   background             (logs: /tmp/$(PROJECT_NAME)-api-worker.log)"
	@echo "  Realtime:     http://localhost:$(REALTIME_PORT)  (logs: /tmp/$(PROJECT_NAME)-realtime.log)"
	@echo "  Admin:        http://localhost:$(ADMIN_PORT)  (logs: /tmp/$(PROJECT_NAME)-admin.log)"${landingServiceLine}${pwaServiceLine}
	@echo ""
	@echo "Run 'make stop' to stop all services"
	@echo "Run 'make logs' to stream all logs"

infra-up: ## Start local infrastructure containers
	docker compose up -d postgres rabbitmq minio minio-create-bucket

infra: infra-up ## Alias for infra-up

infra-down: ## Stop local infrastructure containers
	docker compose down

infra-stop: infra-down ## Alias for infra-down

start: ## Start the project with the Asaje CLI
	npx -p create-asaje-go-vue asaje start . --yes

stop: ## Stop background dev services and clear logs
	@echo "Stopping all $(PROJECT_NAME) services..."
	@-pkill -f "api serve" 2>/dev/null || true
	@-pkill -f "api worker" 2>/dev/null || true
	@-pkill -f "realtime-gateway" 2>/dev/null || true
	@-pkill -f "vite.*$(ADMIN_PORT)" 2>/dev/null || true${landingStop}${pwaStop}
	@rm -f /tmp/$(PROJECT_NAME)-*.log
	@echo "All services stopped and logs cleared"

logs-all: ## Show last 100 lines from all background logs
	@echo "=== API Server ===" && tail -100 /tmp/$(PROJECT_NAME)-api-server.log 2>/dev/null || echo "No logs yet"
	@echo ""
	@echo "=== API Worker ===" && tail -100 /tmp/$(PROJECT_NAME)-api-worker.log 2>/dev/null || echo "No logs yet"
	@echo ""
	@echo "=== Realtime ===" && tail -100 /tmp/$(PROJECT_NAME)-realtime.log 2>/dev/null || echo "No logs yet"
	@echo ""
	@echo "=== Admin ===" && tail -100 /tmp/$(PROJECT_NAME)-admin.log 2>/dev/null || echo "No logs yet"${landingLogsAll}${pwaLogsAll}

logs: ## Stream logs, optionally with SERVICE=api-server|api-worker|realtime|admin|landing|pwa
	@if [ -z "$(SERVICE)" ]; then \
		echo "Streaming all services. Use Ctrl+C to stop."; \
		tail -f /tmp/$(PROJECT_NAME)-*.log; \
	else \
		echo "Streaming $(SERVICE) service. Use Ctrl+C to stop."; \
		tail -f /tmp/$(PROJECT_NAME)-$(SERVICE).log; \
	fi

logs-api: ## Stream API server logs
	@tail -f /tmp/$(PROJECT_NAME)-api-server.log

logs-worker: ## Stream API worker logs
	@tail -f /tmp/$(PROJECT_NAME)-api-worker.log

logs-realtime: ## Stream realtime gateway logs
	@tail -f /tmp/$(PROJECT_NAME)-realtime.log

logs-admin: ## Stream admin logs
	@tail -f /tmp/$(PROJECT_NAME)-admin.log

doctor: ## Check required local tooling and project structure
	npx -p create-asaje-go-vue asaje doctor .

update: ## Update managed boilerplate files from the template
	npx -p create-asaje-go-vue asaje update .

sync-config: ## Rescan Dockerfiles and regenerate Asaje config files
	npx -p create-asaje-go-vue asaje sync-project-config .

sync-readme: ## Regenerate this README from asaje.config.json
	npx -p create-asaje-go-vue asaje sync-readme .

sync-workflow: ## Regenerate the GitHub Actions Railway workflow
	npx -p create-asaje-go-vue asaje sync-github-workflow .

api: ## Start the API server only
	cd api && PORT=$(API_PORT) go run . serve

api-server: api ## Alias for api

worker: ## Start the API worker only
	cd api && go run . worker

api-worker: worker ## Alias for worker

realtime: ## Start the realtime gateway only
	cd realtime-gateway && PORT=$(REALTIME_PORT) go run .

admin: ## Start the admin frontend only
	cd admin && pnpm dev --host 0.0.0.0 --port $(ADMIN_PORT)
${landingTargets}${pwaTargets}
test: ## Run backend tests
	cd api && go test ./...
	cd realtime-gateway && go test ./...

type-check: ## Run frontend type checks where available
	cd admin && pnpm type-check
	@if [ -f landing/package.json ]; then pnpm --dir landing type-check; fi
	@if [ -f pwa/package.json ]; then pnpm --dir pwa type-check; fi

build: ## Build production Docker images
	cd api && docker build -t $(PROJECT_NAME)-api .
	cd realtime-gateway && docker build -t $(PROJECT_NAME)-realtime .
	cd admin && docker build -t $(PROJECT_NAME)-admin .
`;
}
