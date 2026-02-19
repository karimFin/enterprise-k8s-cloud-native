# MyApp — Full Stack Kubernetes Practice Project

A complete full-stack application built for practicing Docker, Kubernetes, and CI/CD with GitHub Actions. Designed to prepare for senior Kubernetes engineer interviews.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└────────────────────────┬────────────────────────────────┘
                         │
                  ┌──────▼──────┐
                  │   Ingress   │  (nginx-ingress + cert-manager TLS)
                  │  Controller │
                  └──────┬──────┘
                         │
              ┌──────────┼──────────┐
              │                     │
       ┌──────▼──────┐      ┌──────▼──────┐
       │  Frontend   │      │   Backend   │
       │  (React +   │─────▶│  (Node.js + │
       │   Nginx)    │      │   Express)  │
       │  2-3 pods   │      │  2-10 pods  │
       └─────────────┘      └──────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │ PostgreSQL  │
                            │(StatefulSet)│
                            └─────────────┘
```

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Frontend      | React 18 + Vite                     |
| Backend       | Node.js + Express                   |
| Database      | PostgreSQL 16                        |
| Containers    | Docker (multi-stage builds)          |
| Orchestration | Kubernetes (Kustomize)               |
| CI/CD         | GitHub Actions                       |
| Monitoring    | Prometheus + Grafana                 |
| TLS           | cert-manager + Let's Encrypt         |
| Ingress       | nginx-ingress-controller             |

## Quick Start

### Local Development (Docker Compose)

```bash
# Clone and start everything
git clone https://github.com/myorg/myapp.git
cd myapp
docker compose up

# With hot reload for development:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Access:
#   Frontend: http://localhost:3000
#   Backend:  http://localhost:8080
#   Health:   http://localhost:8080/health
#   Tasks:    http://localhost:8080/api/tasks
```

### Kubernetes (Local with kind)

```bash
# 1. Create a local cluster
kind create cluster --name myapp

# 2. Bootstrap cluster infrastructure
chmod +x scripts/bootstrap-cluster.sh
./scripts/bootstrap-cluster.sh

# 3. Build and load images into kind
docker compose build
kind load docker-image myapp-frontend:latest --name myapp
kind load docker-image myapp-backend:latest --name myapp

# 4. Deploy to dev
kubectl apply -k k8s/overlays/dev

# 5. Port forward to access
kubectl port-forward svc/frontend 3000:80 -n myapp-dev
kubectl port-forward svc/backend 8080:80 -n myapp-dev
```

### Kubernetes (Cloud - EKS/GKE/AKS)

```bash
# 1. Provision cluster (example with EKS)
eksctl create cluster --name myapp --region us-east-1 --nodes 3

# 2. Bootstrap
./scripts/bootstrap-cluster.sh

# 3. Deploy (CI/CD does this automatically)
kubectl apply -k k8s/overlays/staging
kubectl apply -k k8s/overlays/prod
```

## Project Structure

```
myapp/
├── frontend/                # React frontend
│   ├── Dockerfile           # Multi-stage: build → nginx
│   ├── nginx.conf           # SPA routing + API proxy
│   ├── src/
│   │   ├── App.jsx          # Main UI component
│   │   └── main.jsx         # Entry point
│   └── package.json
│
├── backend/                 # Node.js API
│   ├── Dockerfile           # Multi-stage: deps → runtime
│   ├── src/
│   │   ├── server.js        # Express server + graceful shutdown
│   │   ├── db/
│   │   │   ├── connection.js  # PG pool + retry logic
│   │   │   └── migrate.js     # Schema migrations
│   │   ├── routes/
│   │   │   └── tasks.js       # CRUD API
│   │   └── __tests__/
│   │       └── api.test.js    # Jest tests
│   └── package.json
│
├── k8s/                     # Kubernetes manifests
│   ├── base/                # Base manifests (shared)
│   │   ├── kustomization.yaml
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secrets.yaml
│   │   ├── ingress.yaml
│   │   ├── network-policies.yaml
│   │   ├── backend/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── hpa.yaml
│   │   │   ├── pdb.yaml
│   │   │   └── serviceaccount.yaml
│   │   ├── frontend/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── hpa.yaml
│   │   └── database/
│   │       ├── statefulset.yaml
│   │       ├── service.yaml
│   │       └── pvc.yaml
│   ├── overlays/            # Environment-specific overrides
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── team-setup/          # Developer namespace templates
│
├── .github/workflows/
│   └── ci-cd.yaml           # Full CI/CD pipeline
│
├── scripts/
│   ├── bootstrap-cluster.sh   # Cluster setup
│   └── create-dev-namespace.sh  # Per-developer setup
│
├── docker-compose.yml       # Local dev (production build)
├── docker-compose.dev.yml   # Local dev (hot reload)
└── .env.example
```

## API Endpoints

| Method | Path                      | Description          | Status |
|--------|---------------------------|----------------------|--------|
| GET    | `/`                       | Service info         | ✅     |
| GET    | `/health`                 | Readiness check      | ✅     |
| GET    | `/ready`                  | Startup check        | ✅     |
| GET    | `/api/tasks`              | List tasks           | ✅     |
| GET    | `/api/tasks/stats`        | Dashboard stats      | ✅     |
| GET    | `/api/tasks/:id`          | Get single task      | ✅     |
| POST   | `/api/tasks`              | Create task          | ✅     |
| PUT    | `/api/tasks/:id`          | Update task          | ✅     |
| PATCH  | `/api/tasks/:id/status`   | Toggle task status   | ✅     |
| DELETE | `/api/tasks/:id`          | Delete task          | ✅     |

## Key Kubernetes Concepts Covered

### Workloads
- **Deployment** — stateless apps (frontend, backend)
- **StatefulSet** — stateful apps (PostgreSQL)
- **HorizontalPodAutoscaler** — auto-scaling based on CPU/memory
- **PodDisruptionBudget** — availability during maintenance

### Networking
- **Service (ClusterIP)** — internal service discovery
- **Service (Headless)** — StatefulSet DNS
- **Ingress** — external traffic routing
- **NetworkPolicy** — microsegmentation / zero-trust

### Configuration
- **ConfigMap** — non-sensitive config
- **Secret** — credentials (base64, not encrypted!)
- **Kustomize overlays** — per-environment configuration

### Security
- **RBAC** — role-based access control
- **ServiceAccount** — pod identity
- **SecurityContext** — non-root, read-only FS, drop capabilities
- **Pod Security Standards** — restricted mode
- **NetworkPolicy** — default-deny + allowlist

### Storage
- **PersistentVolumeClaim** — database storage
- **volumeClaimTemplates** — per-pod PVCs in StatefulSets
- **emptyDir** — temp storage for containers

### Observability
- **Health probes** — startup, readiness, liveness
- **Prometheus metrics** — custom + default
- **Structured logging** — JSON logs with pod metadata

## Onboarding a New Developer

```bash
# 1. Set up their namespace
./scripts/create-dev-namespace.sh alice alice@company.com

# 2. They configure their kubeconfig
aws eks update-kubeconfig --name myapp --region us-east-1

# 3. They switch to their namespace
kubectl config set-context --current --namespace=dev-alice

# 4. They run the app locally
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## CI/CD Pipeline Flow

```
PR opened → Test (lint + unit tests) → Security scan (Trivy)
                                              │
                                    merge to main
                                              │
                                    Build Docker images
                                    Push to GHCR
                                    Tag with commit SHA
                                              │
                                    Deploy to Staging
                                    Rollout status check
                                    Smoke test
                                              │
                                    [Manual approval]
                                              │
                                    Deploy to Production
                                    Rollout status check
                                    Post-deploy verification
```

## Common Operations

```bash
# View all resources
kubectl get all -n myapp-production

# Check logs
kubectl logs -f deployment/backend -n myapp-production

# Scale manually
kubectl scale deployment backend --replicas=5 -n myapp-production

# Rollback a bad deploy
kubectl rollout undo deployment/backend -n myapp-production
kubectl rollout history deployment/backend -n myapp-production

# Debug a pod
kubectl exec -it deployment/backend -n myapp-production -- sh
kubectl describe pod <pod-name> -n myapp-production

# Port forward for debugging
kubectl port-forward svc/backend 8080:80 -n myapp-production
kubectl port-forward svc/monitoring-grafana 3001:80 -n monitoring

# View HPA status
kubectl get hpa -n myapp-production

# View resource usage
kubectl top pods -n myapp-production
kubectl top nodes
```

## Interview Topics This Project Covers

- Docker multi-stage builds, layer caching, security
- K8s Deployments vs StatefulSets
- Service types (ClusterIP, Headless, NodePort, LoadBalancer)
- Ingress routing, TLS termination
- Health probes (startup vs readiness vs liveness)
- Graceful shutdown (preStop hooks, SIGTERM handling)
- HPA scaling policies and metrics
- PodDisruptionBudgets
- RBAC (Roles, ClusterRoles, RoleBindings)
- NetworkPolicies (default-deny, microsegmentation)
- ConfigMaps vs Secrets
- Kustomize (base/overlays pattern)
- CI/CD with GitHub Actions
- Image tagging strategies (SHA vs semver vs latest)
- Rolling updates (maxUnavailable, maxSurge)
- Rollback strategies
- Resource requests vs limits
- Namespace isolation for teams
- Monitoring with Prometheus
- Pod security contexts
