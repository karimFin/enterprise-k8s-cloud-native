# ─── MyApp Makefile ────────────────────────────────────────────
# Common commands for development and operations. Run `make help` for details.

.PHONY: help dev dev-hot dev-hot-logs dev-hot-open build test clean deploy-dev deploy-staging deploy-prod act-test act-build act-deploy-dev tf-init-prod tf-plan-prod tf-apply-prod tf-destroy-prod tf-output-prod tf-up-prod tf-down-prod tf-recreate-prod monitoring-up monitoring-url sleep-cloud wake-cloud

ROOT_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
TF ?= $(ROOT_DIR)/.tools/terraform-1.10.5/terraform
TF_DIR ?= $(ROOT_DIR)/terraform/oci-prod

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Local Development ────────────────────────────────────────
dev: ## Start all services (production build)
	docker compose up --build

dev-hot: ## Start with hot reload
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

dev-hot-logs: ## Follow logs for hot reload dev
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

dev-hot-open: ## Start hot reload and open browser
	open http://localhost:3000 && docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

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
	act -W .github/workflows/dev-ci.yaml -j pipeline

act-build: ## Run GitHub Actions build-and-push locally (requires GHCR token)
	act -W .github/workflows/dev-ci.yaml -j pipeline -s GITHUB_TOKEN=$(GITHUB_TOKEN)

act-deploy-dev: ## Run GitHub Actions deploy-dev locally (requires GHCR token)
	GITHUB_EVENT_NAME=push GITHUB_REF=refs/heads/dev act -W .github/workflows/dev-ci.yaml -j pipeline -s GITHUB_TOKEN=$(GITHUB_TOKEN)

# ─── Terraform (OCI prod) ─────────────────────────────────────
tf-init-prod: ## Terraform init for OCI prod
	cd $(TF_DIR) && $(TF) init

tf-plan-prod: ## Terraform plan for OCI prod (uses TF_VAR_* envs)
	cd $(TF_DIR) && $(TF) plan

tf-apply-prod: ## Terraform apply for OCI prod (uses TF_VAR_* envs)
	@[ "$(CONFIRM_APPLY)" = "prod" ] || (echo "Set CONFIRM_APPLY=prod to run apply" && exit 1)
	cd $(TF_DIR) && $(TF) apply -auto-approve

tf-destroy-prod: ## Terraform destroy for OCI prod (uses TF_VAR_* envs)
	@[ "$(CONFIRM_DESTROY)" = "prod" ] || (echo "Set CONFIRM_DESTROY=prod to run destroy" && exit 1)
	cd $(TF_DIR) && $(TF) destroy -auto-approve

tf-up-prod: ## Terraform init + plan + apply for OCI prod
	cd $(TF_DIR) && $(TF) init
	@[ "$(CONFIRM_APPLY)" = "prod" ] || (echo "Set CONFIRM_APPLY=prod to run apply" && exit 1)
	cd $(TF_DIR) && $(TF) apply -auto-approve

tf-recreate-prod: ## Terraform init + apply for OCI prod
	cd $(TF_DIR) && $(TF) init
	@[ "$(CONFIRM_APPLY)" = "prod" ] || (echo "Set CONFIRM_APPLY=prod to run apply" && exit 1)
	cd $(TF_DIR) && $(TF) apply -auto-approve

tf-down-prod: ## Terraform plan + destroy for OCI prod
	cd $(TF_DIR) && $(TF) plan -destroy
	@[ "$(CONFIRM_DESTROY)" = "prod" ] || (echo "Set CONFIRM_DESTROY=prod to run destroy" && exit 1)
	cd $(TF_DIR) && $(TF) destroy -auto-approve

tf-output-prod: ## Terraform outputs for OCI prod
	cd $(TF_DIR) && $(TF) output

monitoring-up: ## Apply Terraform with monitoring enabled
	@[ "$(CONFIRM_APPLY)" = "prod" ] || (echo "Set CONFIRM_APPLY=prod to run apply" && exit 1)
	cd $(TF_DIR) && $(TF) apply -auto-approve -var enable_monitoring=true

monitoring-url: ## Port-forward Grafana to localhost:3001
	kubectl -n monitoring port-forward svc/monitoring-grafana 3001:80
sleep-cloud:
	-kubectl --kubeconfig /Users/mdmirajulkarim/Documents/k8s/myappl/.kubeconfig-oke-prod --context context-c4asgp5m2pq delete svc frontend -n myapp-dev
	-kubectl --kubeconfig /Users/mdmirajulkarim/Documents/k8s/myappl/.kubeconfig-oke-prod --context context-c4asgp5m2pq delete svc frontend -n myapp-production
	-kubectl --kubeconfig /Users/mdmirajulkarim/Documents/k8s/myappl/.kubeconfig-oke-prod --context context-c4asgp5m2pq scale deployment backend frontend --replicas=0 -n myapp-dev
	-kubectl --kubeconfig /Users/mdmirajulkarim/Documents/k8s/myappl/.kubeconfig-oke-prod --context context-c4asgp5m2pq scale statefulset postgres --replicas=0 -n myapp-dev
	-kubectl --kubeconfig /Users/mdmirajulkarim/Documents/k8s/myappl/.kubeconfig-oke-prod --context context-c4asgp5m2pq scale deployment backend frontend --replicas=0 -n myapp-production
	-kubectl --kubeconfig /Users/mdmirajulkarim/Documents/k8s/myappl/.kubeconfig-oke-prod --context context-c4asgp5m2pq scale statefulset postgres --replicas=0 -n myapp-production
	cd $(TF_DIR) && $(TF) apply -auto-approve -var node_pool_size=0

wake-cloud:
	cd $(TF_DIR) && $(TF) apply -auto-approve -var node_pool_size=1
	kubectl --kubeconfig /Users/mdmirajulkarim/Documents/k8s/myappl/.kubeconfig-oke-prod --context context-c4asgp5m2pq apply -k /Users/mdmirajulkarim/Documents/k8s/myappl/k8s/overlays/dev
	kubectl --kubeconfig /Users/mdmirajulkarim/Documents/k8s/myappl/.kubeconfig-oke-prod --context context-c4asgp5m2pq apply -k /Users/mdmirajulkarim/Documents/k8s/myappl/k8s/overlays/prod
