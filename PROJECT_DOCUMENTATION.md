# Your Project: MyApp - Complete Documentation

## 📋 Project Overview

**MyApp** is a full-stack task management application built with modern DevOps practices.

### Technology Stack

```
Frontend        : React 18 + Vite + Nginx
Backend         : Node.js + Express
Database        : PostgreSQL 16
Containers      : Docker
Orchestration   : Kubernetes (K8s)
Config Mgmt     : Kustomize
CI/CD           : GitHub Actions
Networking      : Nginx Ingress + cert-manager
Secrets/Config  : Kubernetes Secrets & ConfigMaps
```

---

## 🏗️ Architecture

### High-Level Diagram

```
Internet User
     ↓
Ingress (nginx-ingress-controller)
├─ TLS/HTTPS (cert-manager + Let's Encrypt)
├─ Rate limiting
└─ Route based on path
     ↓
  ┌─────┴──────┐
  ↓            ↓
Frontend      Backend
(React        (Node.js
 Nginx)        Express)
  ↓            ↓
  └─────┬──────┘
        │ SQL
        ↓
    PostgreSQL
    (StatefulSet)
```

### Kubernetes Resources

#### Frontend
- **Type**: Deployment
- **Replicas**: 2-3 (dev), 3-10 (prod with HPA)
- **Image**: React app built with Vite, served by Nginx
- **Port**: 80 (internal)
- **Resources**: 
  - Dev: 128Mi memory, 100m CPU
  - Prod: 512Mi memory, 500m CPU
- **Health Check**: Nginx defaults (serving static content)

#### Backend
- **Type**: Deployment
- **Replicas**: 2 (dev), 3-10 (prod with HPA)
- **Image**: Node.js 20 Alpine
- **Port**: 8080
- **Health Check**: GET /health endpoint
- **Resources**:
  - Dev: 128Mi memory, 100m CPU
  - Prod: 1Gi memory, 1000m CPU

#### Database
- **Type**: StatefulSet
- **Replicas**: 1 (single database)
- **Image**: PostgreSQL 16 Alpine
- **Port**: 5432
- **Storage**: Persistent Volume Claim (10Gi)
- **Security**: 
  - Runs as non-root user (postgres:999)
  - Credentials from Secrets

#### Network
- **Ingress**: Routes external traffic to services
- **Services**: 
  - Frontend: ClusterIP (internal only)
  - Backend: ClusterIP (internal only)
  - PostgreSQL: ClusterIP (internal only)
- **Network Policies**: Restrict pod-to-pod communication

#### Auto-Scaling
- **HPA** (Horizontal Pod Autoscaler): For backend and frontend
- **Target**: CPU 80% utilization
- **Min Replicas**: 2 (dev), 3 (prod)
- **Max Replicas**: 10 (prod)

---

## 📁 Directory Structure Explained

### Frontend

```
services/frontend/
├── Dockerfile              # Multi-stage build
├── nginx.conf             # Nginx configuration
├── package.json           # Dependencies: React, Vite
├── vite.config.js        # Vite bundler config
├── index.html            # HTML entry point
└── src/
    ├── App.jsx           # Root React component
    ├── main.jsx          # React app entry
    ├── components/       # React components
    │   ├── TaskForm.jsx
    │   ├── TaskList.jsx
    │   └── Stats.jsx
    ├── styles/
    │   └── index.css     # Global styles
    └── test/
        ├── App.test.js
        └── setup.js
```

**Build Process**:
1. Install dependencies (npm ci)
2. Build for production (vite build)
3. Serve with Nginx (simple HTTP server)
4. Final image: ~50-100MB

**Environment Variables**:
- `VITE_API_URL`: Backend API endpoint (e.g., http://localhost:8080)

### Backend

```
services/backend/
├── Dockerfile                # Multi-stage build
├── package.json             # Dependencies: Express, pg
├── src/
│   ├── server.js            # Express app entry
│   ├── app.js               # Express configuration
│   ├── routes/
│   │   ├── health.js        # Health check endpoint
│   │   └── tasks.js         # Task CRUD endpoints
│   ├── middleware/
│   │   └── errorHandler.js  # Error handling
│   └── db/
│       ├── connection.js    # PostgreSQL connection
│       └── migrate.js       # Database migrations
├── __tests__/
│   └── api.test.js          # API tests
└── coverage/                # Test coverage reports
```

**Build Process**:
1. Install dependencies (npm ci --omit=dev)
2. Run tests (jest)
3. Copy code to runtime stage
4. Final image: ~180-250MB

**API Endpoints**:
- `GET /health` - Health check (used by K8s readiness probe)
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Environment Variables**:
- `PORT`: 8080
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: production/development
- `DB_USER`, `DB_PASSWORD`: Database credentials

### Kubernetes Configuration

```
platform/k8s/
├── base/
│   ├── kustomization.yaml          # Base kustomization file
│   ├── namespace.yaml              # myapp namespace definition
│   ├── backend-deployment.yaml    # Backend deployment spec
│   ├── backend-service.yaml       # Backend service
│   ├── backend-hpa.yaml           # Backend auto-scaling
│   ├── backend-pdb.yaml           # Pod disruption budget
│   ├── auth-deployment.yaml       # Auth service deployment spec
│   ├── auth-service.yaml          # Auth service
│   ├── auth-hpa.yaml              # Auth service auto-scaling
│   ├── auth-pdb.yaml              # Auth service disruption budget
│   ├── frontend-deployment.yaml   # Frontend deployment spec
│   ├── frontend-service.yaml      # Frontend service
│   ├── frontend-hpa.yaml          # Frontend auto-scaling
│   ├── notifications-deployment.yaml # Notifications deployment spec
│   ├── notifications-service.yaml # Notifications service
│   ├── postgres-statefulset.yaml  # Database statefulset
│   ├── postgres-service.yaml      # Database service
│   ├── qdrant-statefulset.yaml    # Vector database statefulset
│   ├── qdrant-service.yaml        # Vector database service
│   └── secrets.yaml               # Encrypted secrets
│
└── overlays/
    ├── dev/
    │   └── kustomization.yaml     # Dev overrides: 1 replica, small resources
    └── prod/
        └── kustomization.yaml     # Prod overrides: 3+ replicas with HPA, large resources
```

**Key Files Explained**:

#### backend-deployment.yaml
```yaml
replicas: 2              # Default (overridden per environment)
strategy: RollingUpdate  # Update pods gradually
selector: app=backend    # Pod label to select
containers:
  - name: backend
    image: backend:latest  # Overridden per environment
    port: 8080
    resources:
      requests:            # Minimum guaranteed resources
        cpu: 100m
        memory: 128Mi
      limits:              # Maximum resources allowed
        cpu: 500m
        memory: 512Mi
    livenessProbe:         # Restart if unhealthy
      httpGet: /health
      failureThreshold: 3
    readinessProbe:        # Remove from load balancer if not ready
      httpGet: /health
      initialDelaySeconds: 5
```

#### kustomization.yaml (base)
```yaml
resources:
  - namespace.yaml
  - backend-deployment.yaml
  - backend-service.yaml
  - backend-hpa.yaml
  - frontend-deployment.yaml
  - frontend-service.yaml
  - postgres-statefulset.yaml
  - auth-deployment.yaml
  - auth-service.yaml
  - notifications-deployment.yaml
  - notifications-service.yaml
  - qdrant-statefulset.yaml
  - qdrant-service.yaml
  # ... etc

# This lists all K8s resources to deploy
# Overlays will patch/override specific values
```

#### kustomization.yaml (prod overlay)
```yaml
patchesStrategicMerge:
  - |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: backend
    spec:
      replicas: 3  # Override: more replicas for production
      template:
        spec:
          containers:
            - name: backend
              resources:
                limits:
                  cpu: "1"       # More CPU for production
                  memory: 1Gi    # More memory for production

# Patches override base values
# Final manifest = base + patches
```

### Docker & Docker Compose

#### docker-compose.yml
```yaml
services:
  frontend:
    build: ./services/frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8080
    volumes:
      - ./services/frontend/src:/app/src  # Live reload

  backend:
    build: ./services/backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://myapp:secret@postgres:5432/myapp
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=myapp
      - POSTGRES_PASSWORD=secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Usage**:
```bash
docker-compose up --build        # Start all services
docker-compose logs -f backend   # View logs
docker-compose down -v           # Stop and clean up
```

### GitHub Actions CI/CD

#### .github/workflows/ci-cd.yaml

**Trigger**: Push to any branch or PR to main

**Jobs** (in order):

1. **test**: Run automated tests
   - Runs: npm test (both frontend and backend)
   - Condition: Runs on all branches
   - Passes: Code is ready to build

2. **build-and-push**: Build Docker images
   - Runs: docker build & docker push
   - Condition: Only if tests pass
   - Output: Images pushed to GHCR

3. **validate-k8s**: Validate Kubernetes manifests
   - Runs: kustomize build & kubeconform
   - Condition: Checks syntax
   - Output: Ensures K8s files are valid

4. **deploy-dev**: Deploy to dev namespace
   - Runs: Deploys to dev namespace for verification
   - Condition: Automatic on main branch push
   - Output: Tests deployment process

5. **deploy-prod**: Deploy to production cluster
   - Runs: Deploys to real production cluster
   - Condition: Automatic after dev passes (no approval needed)
   - Output: Shows frontend URL

---

## 🚀 Deployment Environments

### Development (dev)
- **Cluster**: Local (docker-compose or local kind)
- **Namespace**: myapp-dev
- **Replicas**: 1 per service
- **Resources**: Minimal
- **Database**: Local PostgreSQL
- **Update Strategy**: Manual
- **Purpose**: Quick iteration, testing locally

### Production (prod)
- **Cluster**: Real Kubernetes cluster (AWS/GCP/Azure/etc.)
- **Namespace**: myapp-production
- **Replicas**: 3+ (auto-scales to 10 with HPA)
- **Resources**: Large (1 CPU, 1Gi RAM per pod)
- **Database**: Real database (can be managed database like RDS)
- **Update Strategy**: Rolling updates (zero downtime)
- **Monitoring**: Enabled
- **Purpose**: Live application serving real users

---

## 🔄 Complete Deployment Flow

### Step 1: Local Development
```
Developer writes code locally
↓
docker-compose up
↓
Test locally at http://localhost:3000
↓
Verify changes work
```

### Step 2: Commit & Push
```
git add .
git commit -m "Add new feature"
git push origin main
↓
GitHub detects push to main
↓
Triggers .github/workflows/ci-cd.yaml
```

### Step 3: Test Phase
```
GitHub Actions spins up ubuntu-latest runner
↓
Checks out code
↓
Installs Node.js
↓
npm test (runs tests in services/backend/ and services/frontend/)
↓
If tests pass → proceed to build
If tests fail → stop, notify developer
```

### Step 4: Build Phase
```
For each service (frontend, backend):
  ↓
  Docker setup (QEMU, Buildx for multi-arch)
  ↓
  docker build (multi-stage process)
    Stage 1: Install dependencies
    Stage 2: Run tests (if fails, image not created)
    Stage 3: Create runtime image
  ↓
  docker push → GHCR (GitHub Container Registry)
  ↓
  Trivy security scan → Check for vulnerabilities
```

### Step 5: Validate Kubernetes
```
kustomize build platform/k8s/overlays/dev
  ↓
Merges base/ + overlays/dev/
  ↓
Outputs final YAML manifest
  ↓
kubeconform validates against K8s schema
  ↓
If invalid → stop, show errors
If valid → proceed to deploy
```

### Step 6: Deploy to Dev
```
kubectl apply -k platform/k8s/overlays/dev
  ↓
Kustomize merges base + dev overrides
  ↓
kubectl deploys all resources:
  - Namespace
  - ConfigMaps & Secrets
  - Deployments (frontend, backend)
  - StatefulSet (PostgreSQL)
  - Services
  - Ingress
  - Network Policies
  ↓
kubectl rollout status (wait for pods ready)
  ↓
Pods starting → pulling images → becoming ready
  ↓
Show deployment info in logs
```

### Step 7: Deploy to Production (Optional)
```
If KUBE_CONFIG_PROD secret configured:
  ↓
kubectl config set (connect to production cluster)
  ↓
kustomize edit set image (update image tag)
  ↓
kubectl apply -k platform/k8s/overlays/prod
  ↓
Rolling update starts:
  Create new pod with new image
  ↓
  Old pod still running (zero downtime)
  ↓
  Health checks pass
  ↓
  Remove old pod
  ↓
  Repeat for each pod
  ↓
kubectl rollout status (monitor)
  ↓
If healthy → success
If unhealthy → automatic rollback
  ↓
Show frontend URL in logs
```

### Step 8: User Tests
```
GitHub Actions output shows:
  🌐 Frontend URL: https://myapp.example.com
  
User opens browser → visits URL → uses new feature
```

---

## 🔧 Key Configuration Files

### Environment Variables

#### Frontend (.env in docker-compose)
```
VITE_API_URL=http://localhost:8080      # Backend API endpoint
VITE_ENV=development|production         # App environment
```

#### Backend (environment variables)
```
PORT=8080                               # HTTP port
NODE_ENV=production|development         # Node environment
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_USER=myapp                          # Database user
DB_PASSWORD=secret                     # Database password
DB_HOST=postgres                       # Database host
DB_PORT=5432                          # Database port
DB_NAME=myapp                         # Database name
```

### Secrets (Kubernetes)
```
Located in: platform/k8s/base/secrets.yaml
Stored as: Base64 encoded (at rest)
Referenced in: Deployments as environment variables

db-credentials:
  DB_USER: myapp
  DB_PASSWORD: secret

ghcr-secret:
  username: github_username
  password: github_token
  server: ghcr.io
```

---

## 📊 Monitoring & Observability

### Health Checks
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 3
  periodSeconds: 10
  # If 3 consecutive probes fail → Kubernetes kills pod and restarts it

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  # If not ready → remove from load balancer (don't send traffic)
```

### Logs
```bash
# View logs from deployment
kubectl logs deployment/backend -n myapp-production -f

# View logs from specific pod
kubectl logs pod/backend-xyz -n myapp-production

# Previous crash logs
kubectl logs --previous pod/backend-xyz -n myapp-production

# Structured logs (JSON)
kubectl logs deployment/backend -n myapp-production -o jsonpath='{.items[*].metadata.name}'
```

### Metrics
```bash
# Pod resource usage
kubectl top pods -n myapp-production

# Node resource usage
kubectl top nodes

# HPA status
kubectl get hpa -n myapp-production
kubectl describe hpa backend-hpa -n myapp-production
```

### Events
```bash
# Recent events (errors, warnings)
kubectl get events -n myapp-production --sort-by='.lastTimestamp'

# Watch events in real-time
kubectl get events -w -n myapp-production
```

---

## 🔐 Security Considerations

### Authentication
- PostgreSQL credentials stored in Kubernetes Secrets
- GitHub Token for registry authentication
- RBAC: Service accounts with specific permissions

### Network
- Network Policies: Restrict pod-to-pod traffic
- Frontend can talk to Backend (through Ingress)
- Backend can talk to PostgreSQL
- PostgreSQL only talks to Backend

### Pod Security
- Non-root users (appuser, postgres)
- Resource limits prevent resource exhaustion
- Read-only root filesystem (where possible)
- Security context: fsGroup, runAsNonRoot

### Secrets Management
- Never store secrets in Git
- Use Kubernetes Secrets for sensitive data
- In production: Consider HashiCorp Vault or AWS Secrets Manager

### TLS/HTTPS
- cert-manager + Let's Encrypt
- Automatic certificate renewal
- HSTS enabled (force HTTPS)

---

## 🚨 Troubleshooting Common Issues

### Pod won't start (ImagePullBackOff)
```
Cause: Image not found in GHCR
Solution: Check image name/tag, verify it was pushed
kubectl describe pod POD_NAME
# Check Events section for details
```

### Pod crashing (CrashLoopBackOff)
```
Cause: App exits or crashes on startup
Solution: Check logs
kubectl logs --previous pod/POD_NAME
# Look for error messages
```

### High CPU/Memory
```
Cause: App using too much resources
Solution: Either optimize app or increase limits
kubectl set resources deployment backend --limits=cpu=2000m,memory=2Gi
```

### Can't connect to database
```
Cause: Network issue or database down
Solution: 
1. Check postgres pod: kubectl get statefulset postgres
2. Check network policy: kubectl get networkpolicies
3. Test from inside pod: kubectl exec -it POD_NAME -- /bin/sh
```

### Slow deployments
```
Cause: Pod startup time, image download, etc.
Solution:
1. Check resource requests/limits
2. Check health probe configuration
3. Use lightweight base images (Alpine)
4. Pre-pull images on nodes
```

---

## 📈 Scaling & Performance

### Vertical Scaling (more CPU/RAM per pod)
```bash
kubectl set resources deployment backend --limits=cpu=2000m,memory=2Gi
```

### Horizontal Scaling (more pods)
```bash
kubectl scale deployment backend --replicas=10

# Or automatic with HPA
kubectl autoscale deployment backend --min=2 --max=10 --cpu-percent=80
```

### Database Optimization
- Add indexes to frequently queried columns
- Use connection pooling (PgBouncer)
- Consider read replicas
- Use managed database (RDS, Cloud SQL) in production

---

## 🎓 Learning Paths

### Week 1-2
- Understand Docker (build, run, images, registries)
- Understand Kubernetes basics (pods, deployments, services)
- Run docker-compose locally
- Push code and watch CI/CD run

### Week 3-4
- Learn kubectl commands by heart
- Understand Kustomize overlays
- Configure production cluster
- Deploy to production manually

### Month 2
- Set up monitoring (Prometheus, Grafana)
- Learn network policies
- Implement auto-scaling
- Set up logging aggregation

### Month 3+
- Infrastructure as Code (Terraform)
- Service mesh (Istio)
- GitOps (ArgoCD)
- Disaster recovery & backup strategies

---

## 📞 Support & Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Kustomize](https://kustomize.io/)
- [CNCF Certification Programs](https://www.cncf.io/certification/)

---

**You now have a production-ready DevOps infrastructure! 🚀**

Everything you need:
✅ Local development (docker-compose)
✅ Automated testing
✅ Automated building
✅ Automated deployment
✅ Multiple environments
✅ Zero-downtime updates
✅ Auto-scaling
✅ High availability
✅ Security best practices
✅ Monitoring readiness

Go build amazing things! 🎉
