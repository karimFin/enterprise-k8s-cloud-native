# 🚀 Complete DevOps Setup Guide - For New DevOps Engineers

Welcome! This document explains everything we've built for this project and why we built it this way.

---

## 📋 Table of Contents
1. [What is DevOps?](#what-is-devops)
2. [Project Overview](#project-overview)
3. [Architecture Explained](#architecture-explained)
4. [Key Components](#key-components)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Kubernetes (K8s) Basics](#kubernetes-basics)
7. [Docker & Containerization](#docker--containerization)
8. [Deployment Workflow](#deployment-workflow)
9. [Critical Concepts](#critical-concepts)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## What is DevOps?

**DevOps** = **Development + Operations**

It's a practice of:
- ✅ Automating software deployment
- ✅ Managing infrastructure as code
- ✅ Monitoring applications
- ✅ Enabling teams to release code quickly and reliably

**Without DevOps**: Developer writes code → Manual testing → Manual deployment → Waiting for operations team → Slow releases ❌

**With DevOps**: Code pushed → Automated tests → Automated deployment → Running in production → Fast releases ✅

---

## Project Overview

### What Are We Building?

A **full-stack task management application** with:
- **Frontend**: React app (user interface)
- **Backend**: Node.js API (business logic)
- **Database**: PostgreSQL (data storage)
- **Infrastructure**: Kubernetes (container orchestration)
- **CI/CD**: GitHub Actions (automated deployment)

### Project Structure

```
myappl/
├── frontend/              ← React application
│   ├── src/
│   ├── Dockerfile         ← Instructions to build frontend image
│   └── package.json       ← JavaScript dependencies
│
├── backend/               ← Node.js API server
│   ├── src/
│   ├── Dockerfile         ← Instructions to build backend image
│   ├── __tests__/         ← Automated tests
│   └── package.json       ← JavaScript dependencies
│
├── k8s/                   ← Kubernetes configuration
│   ├── base/              ← Base manifests (common to all environments)
│   │   ├── backend-deployment.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── postgres-statefulset.yaml
│   │   ├── ingress.yaml
│   │   └── kustomization.yaml
│   └── overlays/          ← Environment-specific overrides
│       ├── dev/
│       └── prod/
│
├── .github/
│   └── workflows/
│       └── ci-cd.yaml     ← Automation pipeline definition
│
└── docker-compose.yml     ← Local development setup
```

---

## Architecture Explained

### The Big Picture

```
Internet User
     ↓
[Ingress (nginx)] ← Entry point, TLS/HTTPS
     ↓
  ┌─────┴──────┐
  ↓            ↓
Frontend    Backend
(React)     (Node.js)
  ↓            ↓
  └─────┬──────┘
        ↓
    PostgreSQL
    (Database)
```

### What Each Layer Does

#### 1. **Ingress Controller (nginx)**
- Acts like a "receptionist" for your application
- Receives all incoming HTTP requests from the internet
- Routes traffic based on URL paths:
  - `/api/*` → Backend API
  - `/` → Frontend (React app)
- Handles HTTPS/TLS encryption
- Provides rate limiting and security

#### 2. **Frontend (React + Nginx)**
- **React**: JavaScript framework that creates interactive user interfaces
- **Nginx**: Web server that serves the static React app
- **Containerized**: Runs in Docker container in Kubernetes pod
- **Replicas**: Usually 2-3 copies running simultaneously (for high availability)
- **Why multiple copies?** If one crashes, users still get served by another

#### 3. **Backend (Node.js + Express)**
- **Express**: Web framework for handling HTTP requests
- **Handles**: API calls, business logic, database queries
- **Stateless**: Can run multiple copies without them knowing about each other
- **Auto-scaling**: Can increase from 2 to 10 pods during high traffic
- **Health checks**: Kubernetes monitors if it's alive and restarts if dead

#### 4. **PostgreSQL Database**
- Stores all application data (tasks, users, etc.)
- **StatefulSet** (not Deployment): Maintains persistent identity and storage
- **Persistent Volume**: Data survives pod restarts
- Single instance in dev, replicated in production

---

## Key Components

### 1. **Docker - Container Images**

#### What is a Container?
A container is like a **lightweight virtual machine** that packages:
- Your application code
- All dependencies (npm packages, system libraries)
- Everything needed to run, in one portable box

#### Why Containers?
- ✅ Works on your laptop, works in production (no "works on my machine" problem)
- ✅ Isolated from other applications
- ✅ Easy to scale (just run more copies)
- ✅ Easy to update (new version runs alongside old)

#### Our Dockerfiles (Backend Example)

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
COPY package*.json ./
RUN npm ci --omit=dev    # Install only production dependencies

# Stage 2: Run tests
FROM node:20-alpine AS test
COPY . .
RUN npm test             # Run automated tests

# Stage 3: Production runtime
FROM node:20-alpine AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
USER appuser             # Run as non-root user (security!)
EXPOSE 8080
CMD ["node", "src/server.js"]
```

**Why multi-stage?**
- Stage 1: Build dependencies
- Stage 2: Run tests (if tests fail, image isn't created)
- Stage 3: Final production image (smallest, fastest, most secure)

#### Image Build Flow
```
Dockerfile → Docker build → Image (like a template)
                               ↓
                   Run image → Container (running instance)
                               ↓
                   Kubernetes manages → Multiple containers
```

### 2. **Kubernetes - Container Orchestration**

#### What is Kubernetes?
An **orchestrator** that manages containers at scale:
- Runs your Docker containers
- Ensures desired number are always running
- Handles networking
- Manages storage
- Updates applications without downtime
- Scales automatically based on load

#### Key Kubernetes Concepts

##### **Pod**
- Smallest unit in Kubernetes
- Typically runs 1 container (sometimes 2-3)
- Containers in a pod share network namespace (share IP address)
- Ephemeral: created and destroyed frequently

##### **Deployment**
- Describes how to run your application
- "Run 3 copies of backend, restart if one dies"
- Handles rolling updates (update pods gradually)
- Self-healing: if a pod crashes, creates a new one

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3              # Run 3 copies
  selector:
    matchLabels:
      app: backend         # Run pods with label app=backend
  strategy:
    type: RollingUpdate    # Update gradually, not all at once
    rollingUpdate:
      maxSurge: 1          # Create 1 extra during update
      maxUnavailable: 0    # Never go below desired count
```

##### **Service**
- Provides stable IP address for pods
- Acts like a "load balancer" inside the cluster
- Routes traffic to multiple pods
- Pods come and go, but Service IP stays the same

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 80           # External port
      targetPort: 8080   # Pod's internal port
  type: ClusterIP        # Only accessible inside cluster
```

##### **StatefulSet**
- Like Deployment but for **stateful applications**
- Maintains stable identity across restarts
- Used for databases (PostgreSQL)
- Storage persists even if pod is deleted
- Pods have predictable names: postgres-0, postgres-1, etc.

##### **Ingress**
- Routes external traffic into the cluster
- Maps domain names to services
- Handles HTTPS/TLS certificates
- Rate limiting and security

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
spec:
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /api
            backend:
              service:
                name: backend
                port: 80
          - path: /
            backend:
              service:
                name: frontend
                port: 80
```

##### **ConfigMap & Secrets**
- **ConfigMap**: Non-sensitive configuration (database URL, etc.)
- **Secrets**: Sensitive data (passwords, API keys, database credentials)
- Mounted into pods as environment variables or files

### 3. **Kustomize - Configuration Management**

#### Problem
You have the same application running in multiple environments:
- **Dev**: 1 backend pod, small resources
- **Prod**: 10 backend pods, large resources

Copy-pasting YAML files for each environment = maintenance nightmare 😱

#### Solution: Kustomize
- Define **base** YAML files (common to all)
- Define **overlays** for each environment (differences only)
- Kustomize merges them automatically

#### File Structure
```
k8s/
├── base/
│   ├── backend-deployment.yaml      # Generic deployment
│   ├── backend-hpa.yaml             # Auto-scaling rules
│   └── kustomization.yaml           # Base configuration
│
└── overlays/
    ├── dev/
    │   └── kustomization.yaml       # Override: 1 replica, small resources
    └── prod/
        └── kustomization.yaml       # Override: 3-10 replicas, large resources
```

#### Example: Production Patch
```yaml
# k8s/overlays/prod/kustomization.yaml
patches:
  - patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: backend
      spec:
        replicas: 10                    # Production: 10 copies
        template:
          spec:
            containers:
              - name: backend
                resources:
                  limits:
                    cpu: "1"            # Max 1 CPU per pod
                    memory: 1Gi         # Max 1GB RAM per pod
```

**Benefit**: Same base files, different configurations for each environment = DRY (Don't Repeat Yourself)

---

## CI/CD Pipeline

### What is CI/CD?

- **CI (Continuous Integration)**: Automatically test code when pushed
- **CD (Continuous Deployment)**: Automatically deploy to dev/production

### Our Pipeline (GitHub Actions)

```
Developer pushes code to main branch
        ↓
[Test Job] - Run automated tests
    ├─ Test frontend
    └─ Test backend
        ↓
[Build Job] - Build Docker images
    ├─ Build frontend image
    └─ Build backend image
        ↓ (push to GHCR container registry)
        ↓
[Validate K8s] - Check Kubernetes manifests
    └─ Validate YAML files
        ↓
[Deploy to Dev] - Deploy to dev namespace (test environment)
    ├─ Deploy using Kustomize
    └─ Verify deployment
        ↓
[Deploy to Production] - Deploy to real production cluster
    ├─ Use kubeconfig to connect
    ├─ Update image tags
    ├─ Deploy using Kustomize
    ├─ Health check
    └─ Show frontend URL
```

### GitHub Actions Workflow File

**Location**: `.github/workflows/ci-cd.yaml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: ['**']        # Trigger on any branch
  pull_request:
    branches: [main]        # Trigger on PR to main

jobs:
  test:                     # Job 1: Run tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm test

  build-and-push:           # Job 2: Build Docker images
    needs: test             # Only run if test passes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t myapp-backend:${{ github.sha }} ./backend
      - run: docker push ghcr.io/myapp-backend:${{ github.sha }}

  deploy-dev:               # Job 3: Deploy to dev
    needs: [build-and-push]
    runs-on: ubuntu-latest
    steps:
      - run: kubectl apply -k k8s/overlays/dev

  deploy-prod:              # Job 4: Deploy to production
    needs: deploy-dev
    runs-on: ubuntu-latest
    steps:
      - run: kubectl apply -k k8s/overlays/prod
```

### Deployment Strategy

#### **Production**
- Real cluster (once you configure KUBE_CONFIG_PROD)
- Manual approval not needed (automatic after dev passes)
- Shows frontend URL for testing

---

## Docker & Containerization

### How We Build Images

#### 1. Multi-stage Builds (Backend Example)

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Result: Lightweight layer with only production deps

# Stage 2: Testing
FROM node:20-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test
# If test fails → build stops (no image created)

# Stage 3: Runtime (final image)
FROM node:20-alpine AS runtime
RUN adduser -S appuser    # Non-root user (security!)
RUN apk add --no-cache tini  # PID 1 signal handler (K8s graceful shutdown)
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
USER appuser
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
```

**Why?**
- Multi-stage: Smaller final image (test stage not included)
- Non-root user: Security (don't run as root)
- Tini: Proper signal handling for graceful shutdown
- Alpine: Lightweight base image (5MB vs 900MB)

#### 2. Image Naming Convention

```
ghcr.io/mdmirajulkarim/myapp-backend:a1b2c3d4e5f6
│                        │                      │
Registry              Repository             Tag
(GitHub Container)  (Image name)         (Git commit SHA)
```

**Tag**: Using commit SHA ensures each version is unique and traceable

### Build Process in CI/CD

```
1. Developer commits code
   └─ triggers workflow

2. Docker build
   └─ Runs Dockerfile instructions
   └─ Creates image layers
   └─ Each layer cached (faster rebuilds)

3. Docker push
   └─ Upload image to GHCR (GitHub Container Registry)
   └─ Image stored in cloud
   └─ Kubernetes pulls from there

4. Security scanning
   └─ Trivy scans for vulnerabilities
   └─ Blocks deployment if critical issues found
```

### Local Development with Docker Compose

```bash
docker-compose up --build    # Build and run all services locally
```

**docker-compose.yml**:
```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8080
    volumes:
      - ./frontend/src:/app/src    # Live code reload

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/myapp
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=myapp
      - POSTGRES_PASSWORD=secret
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Benefits**:
- ✅ Same setup locally as in production
- ✅ Hot reload (code changes instantly)
- ✅ All services: frontend, backend, database
- ✅ One command to start everything

---

## Kubernetes Basics

### Installation (Production Clusters)

#### AWS EKS
```bash
# Create cluster
aws eks create-cluster \
  --name myapp-prod \
  --version 1.28 \
  --role-arn arn:aws:iam::ACCOUNT:role/eks-service-role \
  --resources-vpc-config subnetIds=subnet-1,subnet-2

# Update kubeconfig
aws eks update-kubeconfig --name myapp-prod

# Deploy
kubectl apply -k k8s/overlays/prod
```

#### Google GKE
```bash
gcloud container clusters create myapp-prod
gcloud container clusters get-credentials myapp-prod
kubectl apply -k k8s/overlays/prod
```

#### Our Dev (Kind)
```bash
# Kind creates cluster in Docker
kind create cluster --name myapp-dev --node-image kindest/node:v1.28.0
# Temporary cluster for testing in CI/CD
```

### Key kubectl Commands

```bash
# Get all resources
kubectl get pods -n myapp-production
kubectl get deployments -n myapp-production
kubectl get services -n myapp-production
kubectl get ingress -n myapp-production

# View logs
kubectl logs -n myapp-production deployment/backend
kubectl logs -n myapp-production pod/backend-abc123

# Check pod status
kubectl describe pod backend-abc123 -n myapp-production

# Execute command in pod
kubectl exec -it backend-abc123 -n myapp-production -- /bin/sh

# Check resource usage
kubectl top pods -n myapp-production
kubectl top nodes

# Apply configuration
kubectl apply -f k8s/overlays/prod/

# Rollback
kubectl rollout undo deployment/backend -n myapp-production

# Port forward (tunnel into cluster)
kubectl port-forward svc/frontend 3000:80 -n myapp-production
# Now visit: http://localhost:3000
```

### Namespaces (Organization)

```bash
# Namespace = logical separation
kubectl get namespaces

# Our namespaces:
# - myapp-dev        (development)
# - myapp-production (production)

# All resources are isolated per namespace
kubectl get pods -n myapp-production    # Only production pods
```

---

## Deployment Workflow

### Step 1: Local Development

```bash
# Clone repo
git clone <repo>
cd myappl

# Run locally
docker-compose up --build

# Visit http://localhost:3000
```

### Step 2: Make Changes & Commit

```bash
# Edit frontend
vim frontend/src/App.jsx

# Commit
git add frontend/
git commit -m "Update frontend UI"
git push origin main    # Must push to MAIN branch
```

### Step 3: Automated Pipeline Triggers

GitHub Actions automatically:
1. **Tests**: Run npm test
2. **Builds**: Create Docker images
3. **Pushes**: Upload to GHCR
4. **Deploys Dev**: Deploy to dev namespace
5. **Validates**: Health checks pass
6. **Deploys Prod**: (automatic, no approval needed currently)
7. **Reports**: Shows frontend URL

### Step 4: Monitor Deployment

```bash
# Watch workflow in GitHub
GitHub → Actions → CI/CD Pipeline → [Running...] ✅

# Real-time pod status
kubectl get pods -n myapp-production -w

# Check if new version is running
kubectl describe deployment backend -n myapp-production
```

### Step 5: Rollback if Issues

```bash
# If something breaks
kubectl rollout undo deployment/backend -n myapp-production

# Check history
kubectl rollout history deployment/backend -n myapp-production
```

---

## Critical Concepts

### 1. **High Availability (HA)**

**Problem**: Single pod dies → users can't access app

**Solution**: Run multiple replicas
```yaml
replicas: 3  # 3 copies running
```

**How it works**:
```
Pod 1 ─┐
       ├─ Service (load balancer) → Routes traffic
Pod 2 ─┤
Pod 3 ─┘

If Pod 1 crashes:
Pod 1 ❌
Pod 2 ✅
Pod 3 ✅
Service routes to Pod 2 & 3 → No downtime!
```

### 2. **Rolling Updates (Zero-downtime Deployments)**

**Old way**: Stop old version → Start new version = Downtime 😞

**Kubernetes way**: Gradually replace old pods with new ones

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1              # Create 1 extra pod during update
    maxUnavailable: 0        # Never go below desired count

# Timeline:
Time 0:  Pod1 Pod2 Pod3 (all old version)
Time 1:  Pod1 Pod2 Pod3 Pod4-new (1 extra during update)
Time 2:  Pod1 Pod2 Pod4-new (remove Pod3-old)
Time 3:  Pod1 Pod4-new Pod5-new (remove Pod2-old)
Time 4:  Pod4-new Pod5-new Pod6-new (remove Pod1-old)
Result:  All running new version, zero downtime ✅
```

### 3. **Auto-scaling (HPA - Horizontal Pod Autoscaler)**

**Problem**: Traffic spikes → slow performance

**Solution**: Automatically increase/decrease pod count based on CPU usage

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2          # Minimum 2 pods
  maxReplicas: 10         # Maximum 10 pods
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80  # Scale up if avg CPU > 80%
```

**In action**:
```
Normal traffic:    2 pods running (minimum)
                        ↓
Traffic spike:     Auto-scales to 5 pods
                        ↓
Traffic drops:     Scales back to 2 pods
→ Saves money! Only pay for what you use
```

### 4. **Pod Disruption Budget (PDB)**

**Problem**: During updates/maintenance, too many pods might die at once

**Solution**: Ensure minimum number of pods always available

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
spec:
  minAvailable: 1         # At least 1 pod always available
  selector:
    matchLabels:
      app: backend
```

### 5. **Network Policies (Security)**

**Problem**: Any pod can talk to any other pod (security risk)

**Solution**: Define who can talk to whom

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend    # Only frontend can send to backend
      ports:
        - protocol: TCP
          port: 8080
```

### 6. **Health Checks (Liveness & Readiness)**

```yaml
containers:
  - name: backend
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 10
      failureThreshold: 3
      # If 3 consecutive health checks fail → kill pod, restart it

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
      # If not ready → remove from load balancer (don't send traffic)
```

### 7. **Resource Limits & Requests**

```yaml
containers:
  - name: backend
    resources:
      requests:
        cpu: 100m            # "Please give me 100 milli-CPUs"
        memory: 128Mi        # "Please give me 128MB RAM"
      limits:
        cpu: 500m            # "Don't use more than 500m CPUs"
        memory: 512Mi        # "Don't use more than 512MB RAM"
```

**Why?**
- **Requests**: Kubernetes scheduler uses this to find nodes with space
- **Limits**: Prevents pod from consuming all cluster resources

### 8. **Persistent Volumes (Storage)**

**Problem**: Pod crashes → data lost (unless using persistent storage)

**Solution**: Attach persistent disk to pods

```yaml
# For PostgreSQL (needs persistent data)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi        # 10GB disk

---
# Mount in pod
containers:
  - name: postgres
    volumeMounts:
      - name: postgres-storage
        mountPath: /var/lib/postgresql/data
volumes:
  - name: postgres-storage
    persistentVolumeClaim:
      claimName: postgres-pvc

# Result: Even if pod crashes, data persists on disk
```

---

## Troubleshooting Guide

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod backend-abc123 -n myapp-production

# Look for events section (shows errors)
# Common issues:
# - ImagePullBackOff: Docker image not found
# - CrashLoopBackOff: App crashes on startup
# - Pending: Not enough resources (increase node count)
```

### High CPU/Memory Usage

```bash
# Check resource usage
kubectl top pods -n myapp-production

# If pod using more than limit → gets killed
# Solution: Increase limits OR optimize app code
kubectl set resources deployment backend \
  -n myapp-production \
  --limits=cpu=1000m,memory=1Gi
```

### Pod Crashing (CrashLoopBackOff)

```bash
# Check logs
kubectl logs pod/backend-abc123 -n myapp-production

# Follow logs in real-time
kubectl logs -f pod/backend-abc123 -n myapp-production

# Previous crash logs
kubectl logs --previous pod/backend-abc123 -n myapp-production
```

### Can't Connect to Pod

```bash
# Check service
kubectl get svc backend -n myapp-production

# Port forward to test locally
kubectl port-forward svc/backend 8080:8080 -n myapp-production
curl http://localhost:8080/health

# Check network policy
kubectl get networkpolicies -n myapp-production
```

### Deployment Stuck

```bash
# Check rollout status
kubectl rollout status deployment/backend -n myapp-production

# If stuck, describe deployment for events
kubectl describe deployment backend -n myapp-production

# Force rollback
kubectl rollout undo deployment/backend -n myapp-production
```

### Database Connection Issues

```bash
# Check if PostgreSQL pod is running
kubectl get statefulset postgres -n myapp-production

# Check postgres logs
kubectl logs statefulset/postgres -n myapp-production

# Connect to postgres pod
kubectl exec -it postgres-0 -n myapp-production -- psql -U myapp
# Inside postgres shell:
\dt               # List tables
SELECT * FROM tasks;  # View data
```

---

## Next Steps (What to Learn)

### 1. **Monitoring & Observability**
- Prometheus: Collect metrics
- Grafana: Visualize metrics
- ELK Stack: Centralized logging

### 2. **Security**
- RBAC: Role-based access control
- Network policies: Pod-to-pod communication rules
- Secrets management: Handle passwords securely

### 3. **Advanced Kubernetes**
- Service Mesh (Istio): Advanced traffic management
- Operators: Automate complex applications
- Custom Resources: Extend Kubernetes

### 4. **Infrastructure as Code (IaC)**
- Terraform: Define infrastructure in code
- Helm: Package Kubernetes apps

### 5. **GitOps**
- ArgoCD: Continuous deployment from Git
- Flux: Declarative continuous delivery

---

## Key Takeaways

### ✅ What We've Built

1. **Containerization**: Docker packages app + dependencies
2. **Orchestration**: Kubernetes manages containers at scale
3. **Configuration Management**: Kustomize handles multi-environment setup
4. **CI/CD Automation**: GitHub Actions deploys automatically
5. **High Availability**: Multiple replicas ensure no single point of failure
6. **Zero-downtime Deployments**: Rolling updates keep app running during updates
7. **Auto-scaling**: HPA adjusts pods based on traffic
8. **Security**: Network policies, non-root users, resource limits
9. **Monitoring & Troubleshooting**: Health checks and logging

### ✅ Why This Matters

```
Before DevOps:
Monday: Developer writes code
Tuesday: Manual testing
Wednesday: Operations team reviews
Thursday: Manual deployment
Friday: Hope it works! 🤞
6+ hours downtime if something breaks

After DevOps:
Developer: Push to main
Automation: Tests → Builds → Deploys
Deployment time: < 5 minutes
Zero downtime ✅
```

### ✅ Production Readiness Checklist

- [ ] Tests passing
- [ ] Security scanning passing
- [ ] Dev deployment successful
- [ ] Health checks configured
- [ ] Resource limits set
- [ ] Persistent storage for data
- [ ] Network policies configured
- [ ] Monitoring enabled
- [ ] Logs centralized
- [ ] Runbooks documented
- [ ] Disaster recovery plan

---

## Commands Reference

```bash
# Development
docker-compose up --build
docker-compose logs -f backend

# Testing
npm test
npm run test:watch

# Building
docker build -t myapp-backend:latest ./backend

# Kubernetes - Common Tasks
kubectl get pods -n myapp-production
kubectl describe pod POD_NAME -n myapp-production
kubectl logs deployment/backend -n myapp-production -f
kubectl exec -it deployment/backend -n myapp-production -- /bin/sh
kubectl apply -k k8s/overlays/prod/
kubectl rollout status deployment/backend -n myapp-production
kubectl rollout undo deployment/backend -n myapp-production
kubectl port-forward svc/frontend 3000:80 -n myapp-production

# Debugging
kubectl get events -n myapp-production --sort-by='.lastTimestamp'
kubectl top pods -n myapp-production
kubectl resource capacity
```

---

## Questions to Ask Yourself

1. What happens if the database pod crashes?
2. How many users can the system handle (before needing to scale)?
3. How long does it take to deploy a new version?
4. How would you rollback if a deployment breaks production?
5. What happens if the entire Kubernetes cluster goes down?
6. How do you update the PostgreSQL version without losing data?
7. How do you securely store database passwords?
8. How do you monitor if the app is running correctly?
9. How do you know if pods are healthy?
10. How would you debug if frontend can't connect to backend?

---

## Glossary

| Term | Meaning |
|------|---------|
| Pod | Smallest Kubernetes unit, usually 1 container |
| Deployment | Describes how to run your app (replicas, strategy) |
| Service | Stable IP/DNS for accessing pods |
| Ingress | Routes external traffic into cluster |
| StatefulSet | Like Deployment but for stateful apps (databases) |
| Container | Packaged app + dependencies in isolated environment |
| Image | Blueprint for containers (built from Dockerfile) |
| Registry | Cloud storage for Docker images (GHCR) |
| Orchestration | Managing containers automatically (Kubernetes does this) |
| CI/CD | Automated testing and deployment |
| Rolling Update | Gradually replace old pods with new ones |
| HPA | Auto-scaling based on metrics |
| PDB | Ensure minimum pods available during updates |
| Network Policy | Define pod-to-pod communication rules |
| Persistent Volume | Disk that survives pod crashes |
| ConfigMap | Non-sensitive configuration |
| Secrets | Sensitive data (passwords, API keys) |
| Namespace | Logical separation of resources |
| Kustomize | Tool for multi-environment configuration |
| kubectl | Command-line tool to interact with Kubernetes |

---

## Resources

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Kustomize Documentation](https://kustomize.io/)
- [CNCF Learning Path](https://www.cncf.io/training/)

---

**Remember**: DevOps is about automation, reliability, and fast feedback. Every manual step is a potential failure point!

Happy deploying! 🚀
