# ─── MyApp Makefile ────────────────────────────────────────────
# Common commands for development and operations. Run `make help` for details.

.PHONY: help dev dev-hot build test clean deploy-dev deploy-staging deploy-prod act-test act-build act-deploy-dev

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Local Development ────────────────────────────────────────
dev: ## Start all services (production build)
	docker compose up --build

dev-hot: ## Start with hot reload
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

down: ## Stop all services without removing volumes
	docker compose down

down-clean: ## Stop and remove volumes
	docker compose down -v

logs: ## Follow logs
	docker compose logs -f

# ─── Build ────────────────────────────────────────────────────
build: ## Build Docker images
	docker compose build

build-backend: ## Build backend image only
	docker build -t myapp-backend:latest ./backend

build-frontend: ## Build frontend image only
	docker build -t myapp-frontend:latest ./frontend

# ─── Test ─────────────────────────────────────────────────────
test: ## Run all tests
	cd backend && npm test
	cd frontend && npm test

test-backend: ## Run backend tests
	cd backend && npm test

test-frontend: ## Run frontend tests
	cd frontend && npm test

# ─── Kubernetes ───────────────────────────────────────────────
deploy-dev: ## Deploy to dev namespace
	kubectl apply -k k8s/overlays/dev

deploy-staging: ## Deploy to staging namespace
	kubectl apply -k k8s/overlays/staging

deploy-prod: ## Deploy to production namespace
	kubectl apply -k k8s/overlays/prod

k8s-status: ## Show all resources in all namespaces
	@echo "=== Dev ===" && kubectl get all -n myapp-dev 2>/dev/null || true
	@echo "\n=== Staging ===" && kubectl get all -n myapp-staging 2>/dev/null || true
	@echo "\n=== Production ===" && kubectl get all -n myapp-production 2>/dev/null || true

# ─── Cluster Setup ────────────────────────────────────────────
bootstrap: ## Bootstrap a new cluster
	chmod +x scripts/bootstrap-cluster.sh
	./scripts/bootstrap-cluster.sh

create-dev-ns: ## Create dev namespace (usage: make create-dev-ns NAME=alice EMAIL=alice@co.com)
	chmod +x scripts/create-dev-namespace.sh
	./scripts/create-dev-namespace.sh $(NAME) $(EMAIL)

# ─── Kind (Local K8s) ────────────────────────────────────────
kind-create: ## Create a local kind cluster
	kind create cluster --name myapp --config kind-config.yaml 2>/dev/null || kind create cluster --name myapp

kind-load: build ## Build and load images into kind
	kind load docker-image myapp-backend:latest --name myapp
	kind load docker-image myapp-frontend:latest --name myapp

kind-delete: ## Delete kind cluster
	kind delete cluster --name myapp

# ─── Cleanup ──────────────────────────────────────────────────
clean: ## Remove build artifacts and containers
	docker compose down -v --rmi local
	rm -rf frontend/dist frontend/node_modules
	rm -rf backend/node_modules backend/coverage

# ─── Local GitHub Actions (act) ───────────────────────────────
act-test: ## Run GitHub Actions test job locally
	act -j test

act-build: ## Run GitHub Actions build-and-push locally (requires GHCR token)
	act -j build-and-push -s GITHUB_TOKEN=$(GITHUB_TOKEN)

act-deploy-dev: ## Run GitHub Actions deploy-dev locally (requires GHCR token)
	act -j deploy-dev -s GITHUB_TOKEN=$(GITHUB_TOKEN)
