.PHONY: dev dev-bg api-server api-worker realtime admin landing pwa stop logs logs-all logs-api logs-worker logs-realtime logs-admin logs-landing logs-pwa doctor

# Default project name from directory
PROJECT_NAME := $(shell basename $(CURDIR))

# Start all services in foreground (recommended for development)
dev:
	@echo "Starting $(PROJECT_NAME) services..."
	@echo "Use Ctrl+C to stop all services"
	@trap 'echo ""; echo "Stopping services..."; $(MAKE) stop' INT; \
	(cd api && go run . serve 2>&1 | sed 's/^/[API] /' &) && \
	(cd api && go run . worker 2>&1 | sed 's/^/[WORKER] /' &) && \
	(cd realtime-gateway && go run . 2>&1 | sed 's/^/[REALTIME] /' &) && \
	(cd admin && pnpm dev 2>&1 | sed 's/^/[ADMIN] /' &) && \
	wait

# Start all services in background
dev-bg:
	@echo "Starting $(PROJECT_NAME) services in background..."
	@echo "Logs will be written to /tmp/$(PROJECT_NAME)-*.log"
	@(cd api && go run . serve > /tmp/$(PROJECT_NAME)-api-server.log 2>&1 &)
	@(cd api && go run . worker > /tmp/$(PROJECT_NAME)-api-worker.log 2>&1 &)
	@(cd realtime-gateway && go run . > /tmp/$(PROJECT_NAME)-realtime.log 2>&1 &)
	@(cd admin && pnpm dev > /tmp/$(PROJECT_NAME)-admin.log 2>&1 &)
	@if [ -d "landing" ]; then \
		(cd landing && pnpm dev > /tmp/$(PROJECT_NAME)-landing.log 2>&1 &); \
	fi
	@if [ -d "pwa" ]; then \
		(cd pwa && pnpm dev > /tmp/$(PROJECT_NAME)-pwa.log 2>&1 &); \
	fi
	@echo "All services started!"
	@echo ""
	@echo "Services:"
	@echo "  API Server:   http://localhost:8080  (logs: /tmp/$(PROJECT_NAME)-api-server.log)"
	@echo "  API Worker:   background             (logs: /tmp/$(PROJECT_NAME)-api-worker.log)"
	@echo "  Realtime:     http://localhost:8081  (logs: /tmp/$(PROJECT_NAME)-realtime.log)"
	@echo "  Admin:        http://localhost:5173  (logs: /tmp/$(PROJECT_NAME)-admin.log)"
	@if [ -d "landing" ]; then echo "  Landing:      http://localhost:5174  (logs: /tmp/$(PROJECT_NAME)-landing.log)"; fi
	@if [ -d "pwa" ]; then echo "  PWA:          http://localhost:5175  (logs: /tmp/$(PROJECT_NAME)-pwa.log)"; fi
	@echo ""
	@echo "Run 'make stop' to stop all services"
	@echo "Run 'make logs' to stream all logs"

# Individual service targets (foreground)
api-server:
	@echo "Starting API server..."
	@cd api && go run . serve

api-worker:
	@echo "Starting API worker..."
	@cd api && go run . worker

realtime:
	@echo "Starting realtime gateway..."
	@cd realtime-gateway && go run .

admin:
	@echo "Starting admin panel..."
	@cd admin && pnpm dev

landing:
	@if [ -d "landing" ]; then \
		echo "Starting landing page..."; \
		cd landing && pnpm dev; \
	else \
		echo "Landing directory not found"; \
	fi

pwa:
	@if [ -d "pwa" ]; then \
		echo "Starting PWA dev server..."; \
		cd pwa && pnpm dev; \
	else \
		echo "PWA directory not found"; \
	fi

# Stop all background services and clear logs
stop:
	@echo "Stopping all $(PROJECT_NAME) services..."
	@-pkill -f "api serve" 2>/dev/null || true
	@-pkill -f "api worker" 2>/dev/null || true
	@-pkill -f "realtime-gateway" 2>/dev/null || true
	@-pkill -f "vite.*5173" 2>/dev/null || true
	@-pkill -f "vite.*5174" 2>/dev/null || true
	@-pkill -f "vite.*5175" 2>/dev/null || true
	@-pkill -f "vite.*9000" 2>/dev/null || true
	@rm -f /tmp/$(PROJECT_NAME)-*.log
	@echo "All services stopped and logs cleared"

# Show logs for all services (last 100 lines)
logs-all:
	@echo "=== API Server ===" && tail -100 /tmp/$(PROJECT_NAME)-api-server.log 2>/dev/null || echo "No logs yet"
	@echo ""
	@echo "=== API Worker ===" && tail -100 /tmp/$(PROJECT_NAME)-api-worker.log 2>/dev/null || echo "No logs yet"
	@echo ""
	@echo "=== Realtime ===" && tail -100 /tmp/$(PROJECT_NAME)-realtime.log 2>/dev/null || echo "No logs yet"
	@echo ""
	@echo "=== Admin ===" && tail -100 /tmp/$(PROJECT_NAME)-admin.log 2>/dev/null || echo "No logs yet"
	@if [ -d "landing" ]; then \
		echo ""; echo "=== Landing ===" && tail -100 /tmp/$(PROJECT_NAME)-landing.log 2>/dev/null || echo "No logs yet"; \
	fi
	@if [ -d "pwa" ]; then \
		echo ""; echo "=== PWA ===" && tail -100 /tmp/$(PROJECT_NAME)-pwa.log 2>/dev/null || echo "No logs yet"; \
	fi

# Stream logs in real-time (tail -f). Use SERVICE=xxx to stream a specific service
logs:
	@if [ -z "$(SERVICE)" ]; then \
		echo "Streaming all services. Use Ctrl+C to stop."; \
		tail -f /tmp/$(PROJECT_NAME)-*.log; \
	else \
		echo "Streaming $(SERVICE) service. Use Ctrl+C to stop."; \
		tail -f /tmp/$(PROJECT_NAME)-$(SERVICE).log; \
	fi

# Individual log streaming targets
logs-api:
	@tail -f /tmp/$(PROJECT_NAME)-api-server.log

logs-worker:
	@tail -f /tmp/$(PROJECT_NAME)-api-worker.log

logs-realtime:
	@tail -f /tmp/$(PROJECT_NAME)-realtime.log

logs-admin:
	@tail -f /tmp/$(PROJECT_NAME)-admin.log

logs-landing:
	@tail -f /tmp/$(PROJECT_NAME)-landing.log 2>/dev/null || echo "Landing not started"

logs-pwa:
	@tail -f /tmp/$(PROJECT_NAME)-pwa.log 2>/dev/null || echo "PWA not started"

# Run CLI doctor
doctor:
	@echo "Checking project setup..."
	@if command -v npx >/dev/null 2>&1; then \
		npx create-asaje-go-vue@latest asaje doctor .; \
	else \
		echo "npx not found. Install Node.js first."; \
	fi

# Start infrastructure only (Docker)
infra:
	@echo "Starting infrastructure services..."
	@docker-compose up postgres rabbitmq minio

# Stop infrastructure
infra-stop:
	@echo "Stopping infrastructure..."
	@docker-compose down

# Install dependencies for all services
install:
	@echo "Installing dependencies..."
	@cd api && go mod download
	@cd realtime-gateway && go mod download
	@cd admin && pnpm install
	@if [ -d "landing" ]; then cd landing && pnpm install; fi
	@if [ -d "pwa" ]; then cd pwa && pnpm install; fi
	@echo "Dependencies installed"

# Run all tests
test:
	@echo "Running tests..."
	@cd api && go test ./... -count=1
	@cd admin && pnpm test:unit

# Build production images
build:
	@echo "Building production images..."
	@cd api && docker build -t $(PROJECT_NAME)-api .
	@cd realtime-gateway && docker build -t $(PROJECT_NAME)-realtime .
	@cd admin && docker build -t $(PROJECT_NAME)-admin .

# Load testing (requires artillery: npm install -g artillery)
load-test-api:
	@echo "Running API load tests..."
	@cd api/load-tests && artillery run artillery.config.yml

load-test-api-smoke:
	@echo "Running API smoke test..."
	@cd api/load-tests && artillery run quick-smoke-test.yml

load-test-api-spike:
	@echo "Running API spike test..."
	@cd api/load-tests && artillery run spike-test.yml

load-test-realtime-sse:
	@echo "Running Realtime SSE load tests..."
	@cd realtime-gateway/load-tests && artillery run sse-load-test.yml

load-test-realtime-ws:
	@echo "Running Realtime WebSocket load tests..."
	@cd realtime-gateway/load-tests && artillery run websocket-load-test.yml

# Help
help:
	@echo "Available targets:"
	@echo "  dev         - Start all services in foreground (Ctrl+C to stop)"
	@echo "  dev-bg      - Start all services in background"
	@echo "  api-server  - Start API server (foreground)"
	@echo "  api-worker  - Start API worker (foreground)"
	@echo "  realtime    - Start realtime gateway (foreground)"
	@echo "  admin       - Start admin panel (foreground)"
	@echo "  landing     - Start landing page (foreground, if exists)"
	@echo "  pwa         - Start PWA dev server (foreground, if exists)"
	@echo "  stop        - Stop all background services"
	@echo "  logs        - Stream logs (use SERVICE=xxx for specific)"
	@echo "  logs-all    - Show last 100 lines of all logs"
	@echo "  logs-api    - Stream API logs"
	@echo "  logs-worker - Stream worker logs"
	@echo "  logs-realtime - Stream realtime logs"
	@echo "  logs-admin  - Stream admin logs"
	@echo "  infra       - Start Docker infrastructure"
	@echo "  infra-stop  - Stop Docker infrastructure"
	@echo "  install     - Install all dependencies"
	@echo "  test        - Run all tests"
	@echo "  build       - Build production Docker images"
	@echo "  doctor      - Check project setup via CLI"
	@echo "  load-test-api         - Run API load tests (needs artillery)"
	@echo "  load-test-api-smoke   - Run API smoke test"
	@echo "  load-test-api-spike   - Run API spike test"
	@echo "  load-test-realtime-sse - Run Realtime SSE load tests"
	@echo "  load-test-realtime-ws  - Run Realtime WebSocket load tests"
	@echo "  help        - Show this help"
