# DevOps Cheat Sheet - Command Reference

## 🐳 Docker Commands

### Build & Run Locally
```bash
# Build image
docker build -t myapp-backend:v1.0 ./services/backend

# Run container
docker run -p 8080:8080 myapp-backend:v1.0

# Run with environment variables
docker run -e DATABASE_URL=postgresql://... -p 8080:8080 myapp-backend:v1.0

# Interactive shell in container
docker run -it myapp-backend:v1.0 /bin/sh
```

### Container Management
```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# View container logs
docker logs CONTAINER_ID

# Follow logs (real-time)
docker logs -f CONTAINER_ID

# Stop container
docker stop CONTAINER_ID

# Remove container
docker rm CONTAINER_ID

# View image layers
docker history myapp-backend:v1.0
```

### Images
```bash
# List images
docker images

# Remove image
docker rmi myapp-backend:v1.0

# Tag image
docker tag myapp-backend:v1.0 ghcr.io/myuser/myapp-backend:v1.0

# Push to registry
docker push ghcr.io/myuser/myapp-backend:v1.0

# Pull from registry
docker pull ghcr.io/myuser/myapp-backend:v1.0
```

### Docker Compose (Local Development)
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Rebuild before starting
docker-compose up --build

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Execute command in service
docker-compose exec backend npm test

# Scale service
docker-compose up --scale backend=3
```

---

## ☸️ Kubernetes Commands

### Cluster Info
```bash
# Get cluster info
kubectl cluster-info

# Get nodes
kubectl get nodes

# Node details
kubectl describe node NODE_NAME

# Available APIs
kubectl api-resources
```

### Namespaces
```bash
# List namespaces
kubectl get namespaces

# Create namespace
kubectl create namespace myapp-prod

# Set default namespace
kubectl config set-context --current --namespace=myapp-prod

# All commands now use myapp-prod by default
kubectl get pods  # Uses myapp-prod
```

### Pods (Viewing)
```bash
# List pods
kubectl get pods

# List in specific namespace
kubectl get pods -n myapp-production

# Show more details
kubectl get pods -o wide

# Watch pods (real-time updates)
kubectl get pods -w

# YAML format
kubectl get pods -o yaml

# JSON format
kubectl get pods -o json

# Describe pod (detailed info)
kubectl describe pod PODNAME

# Check pod events
kubectl get events -n myapp-production --sort-by='.lastTimestamp'
```

### Pods (Debugging)
```bash
# View logs
kubectl logs POD_NAME

# Follow logs (real-time)
kubectl logs -f POD_NAME

# Logs from previous crashed pod
kubectl logs --previous POD_NAME

# Logs from specific container
kubectl logs POD_NAME -c CONTAINER_NAME

# View all containers
kubectl get pods POD_NAME -o jsonpath='{.spec.containers[*].name}'

# Execute command in pod
kubectl exec -it POD_NAME -- /bin/sh

# Copy file from pod
kubectl cp POD_NAME:/app/logs.txt ./logs.txt

# Port forward to pod
kubectl port-forward POD_NAME 8080:8080
# Now: curl http://localhost:8080
```

### Deployments
```bash
# List deployments
kubectl get deployments

# Detailed info
kubectl describe deployment DEPLOYMENT_NAME

# Update image
kubectl set image deployment/backend backend=ghcr.io/myuser/myapp-backend:v2.0

# Rollout status
kubectl rollout status deployment/backend

# Rollout history
kubectl rollout history deployment/backend

# Rollback to previous
kubectl rollout undo deployment/backend

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2

# Pause rollout
kubectl rollout pause deployment/backend

# Resume rollout
kubectl rollout resume deployment/backend
```

### Services
```bash
# List services
kubectl get services

# Describe service
kubectl describe service SERVICE_NAME

# Port forward to service
kubectl port-forward svc/backend 8080:80
```

### ConfigMaps & Secrets
```bash
# List configmaps
kubectl get configmaps

# View configmap
kubectl describe configmap CONFIG_NAME

# Get configmap as YAML
kubectl get configmap CONFIG_NAME -o yaml

# Create configmap
kubectl create configmap app-config --from-literal=DATABASE_HOST=postgres

# List secrets
kubectl get secrets

# Get secret (base64 encoded)
kubectl get secret SECRET_NAME -o yaml

# Create secret
kubectl create secret generic db-password --from-literal=password=mysecretpass
```

### HPA (Auto-scaling)
```bash
# List HPAs
kubectl get hpa

# View HPA status
kubectl describe hpa HPANAME

# Manually scale (overrides HPA temporarily)
kubectl scale deployment backend --replicas=5

# Edit HPA
kubectl edit hpa HPANAME
```

### Apply & Deploy
```bash
# Apply configuration
kubectl apply -f deployment.yaml

# Apply all in directory
kubectl apply -f platform/k8s/

# Apply Kustomize
kubectl apply -k platform/k8s/overlays/prod/

# Dry run (test without applying)
kubectl apply -f deployment.yaml --dry-run=client

# View what would be applied
kubectl apply -f deployment.yaml --dry-run=client -o yaml
```

### Cleanup
```bash
# Delete pod
kubectl delete pod POD_NAME

# Delete deployment (also deletes pods)
kubectl delete deployment DEPLOYMENT_NAME

# Delete all pods in namespace
kubectl delete pods --all -n myapp-production

# Delete entire namespace (everything in it)
kubectl delete namespace myapp-production

# Delete resource by file
kubectl delete -f deployment.yaml
```

### Resource Usage
```bash
# Pod resource usage
kubectl top pods

# Node resource usage
kubectl top nodes

# Pod usage per namespace
kubectl top pods --all-namespaces

# Describe node capacity
kubectl describe node NODE_NAME | grep -A 5 "Allocatable"
```

### Network & Connectivity
```bash
# Get ingress
kubectl get ingress

# Describe ingress
kubectl describe ingress INGRESS_NAME

# Port forward to service
kubectl port-forward svc/frontend 3000:80 -n myapp-production
# Visit: http://localhost:3000

# Exec into pod to test network
kubectl exec -it POD_NAME -- /bin/sh
$ curl http://backend:8080/api/health  # Test connectivity
$ wget -qO- http://postgres:5432       # Test db connectivity
```

### Troubleshooting
```bash
# Get all events in namespace
kubectl get events -n myapp-production

# Get events sorted by time
kubectl get events --sort-by='.lastTimestamp' -n myapp-production

# Watch events in real-time
kubectl get events -w -n myapp-production

# Get pod with specific label
kubectl get pods -l app=backend

# Get all resources
kubectl get all -n myapp-production

# View resource limits
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.allocatable.cpu,MEMORY:.status.allocatable.memory,PODS:.status.allocatable.pods

# Check persistent volumes
kubectl get pv

# Check persistent volume claims
kubectl get pvc

# View pod scheduling
kubectl describe pod POD_NAME | grep -A 10 "Events:"
```

---

## 🔨 Kustomize Commands

### Build & Deploy
```bash
# Build overlay (see final YAML)
kustomize build platform/k8s/overlays/prod

# Apply overlay
kubectl apply -k platform/k8s/overlays/prod

# Dry run
kubectl apply -k platform/k8s/overlays/prod --dry-run=client

# Edit deployment image in overlay
cd platform/k8s/overlays/prod
kustomize edit set image backend=ghcr.io/myuser/myapp-backend:v2.0
cd - && kubectl apply -k platform/k8s/overlays/prod
```

### View Kustomization
```bash
# View final manifest
kustomize build platform/k8s/overlays/prod > final.yaml
cat final.yaml

# Compare overlays
kustomize build platform/k8s/overlays/dev > dev.yaml
kustomize build platform/k8s/overlays/prod > prod.yaml
diff dev.yaml prod.yaml
```

---

## 🔐 Git Commands

### Commit & Push
```bash
# Check status
git status

# Add files
git add services/frontend/

# Commit
git commit -m "Add new feature"

# Push to branch
git push origin feature-branch

# Push to main (triggers CI/CD!)
git push origin main

# View commit history
git log --oneline

# See what changed
git diff
```

### Branches
```bash
# List branches
git branch

# Create branch
git checkout -b feature-new-ui

# Switch branch
git checkout main

# Delete branch
git branch -d feature-new-ui

# Force delete
git branch -D feature-new-ui
```

---

## 🚀 GitHub Actions

### Manual Workflow Trigger
```bash
# Trigger workflow via CLI
gh workflow run ci-cd.yaml --ref main

# View workflow runs
gh run list

# View specific run logs
gh run view RUN_ID --log
```

---

## 📝 System Debugging

### Check All Deployments Status
```bash
# Script: check_prod_health.sh
#!/bin/bash

NAMESPACE="myapp-production"

echo "=== Deployments ==="
kubectl get deployments -n $NAMESPACE

echo ""
echo "=== Pods ==="
kubectl get pods -n $NAMESPACE -o wide

echo ""
echo "=== Services ==="
kubectl get svc -n $NAMESPACE

echo ""
echo "=== Resource Usage ==="
kubectl top pods -n $NAMESPACE

echo ""
echo "=== Recent Events ==="
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10
```

### Check Pod Logs (All Replicas)
```bash
# Script: check_backend_logs.sh
#!/bin/bash

NAMESPACE="myapp-production"
PODS=$(kubectl get pods -l app=backend -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')

for pod in $PODS; do
    echo "=== Logs from $pod ==="
    kubectl logs $pod -n $NAMESPACE --tail=20
    echo ""
done
```

### Restart Deployment
```bash
# Force restart (useful for config changes)
kubectl rollout restart deployment/backend -n myapp-production

# Status
kubectl rollout status deployment/backend -n myapp-production
```

---

## 🔍 Quick Troubleshooting

### Pod Won't Start
```bash
kubectl describe pod POD_NAME -n myapp-production
# Look for "Events" section
# Common: ImagePullBackOff, CrashLoopBackOff, Pending
```

### Can't Connect to Service
```bash
# Test from inside cluster
kubectl exec -it POD_NAME -- /bin/sh
$ curl http://backend:8080/health

# Port forward to test locally
kubectl port-forward svc/backend 8080:8080
curl http://localhost:8080/health
```

### Database Connection Failed
```bash
# Check postgres is running
kubectl get statefulset postgres

# Connect to postgres
kubectl exec -it postgres-0 -- psql -U myapp -c "\dt"

# Check postgres logs
kubectl logs statefulset/postgres
```

### Out of Disk/Memory
```bash
kubectl top nodes
# If high, scale down pods or add more nodes
```

### Stuck Rollout
```bash
kubectl rollout status deployment/backend
# If stuck, check pod events
kubectl describe pod POD_NAME
# Rollback if needed
kubectl rollout undo deployment/backend
```

---

## 📊 Common Patterns

### Scale Up for Traffic Spike
```bash
# Temporary manual scale
kubectl scale deployment backend --replicas=10

# Or edit HPA
kubectl edit hpa backend-hpa
# Increase maxReplicas
```

### Emergency Rollback
```bash
# Quick rollback
kubectl rollout undo deployment/backend

# Check history
kubectl rollout history deployment/backend

# Rollback to specific version
kubectl rollout undo deployment/backend --to-revision=2
```

### Database Backup
```bash
# PostgreSQL dump
kubectl exec postgres-0 -- pg_dump -U myapp myapp > backup.sql

# Restore
cat backup.sql | kubectl exec -i postgres-0 -- psql -U myapp myapp
```

### Update Image Without Downtime
```bash
# Using kubectl set image
kubectl set image deployment/backend backend=ghcr.io/myuser/myapp-backend:v2.0 --record

# Using kubectl patch
kubectl patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","image":"ghcr.io/myuser/myapp-backend:v2.0"}]}}}}'

# Using kustomize (recommended)
cd platform/k8s/overlays/prod
kustomize edit set image backend=ghcr.io/myuser/myapp-backend:v2.0
kubectl apply -k .
```

---

## ⏱️ Key Timeouts to Remember

```
Pod startup               : ~10 seconds
Readiness probe          : 5-30 seconds
Liveness probe restart   : ~30 seconds
Rolling update           : 5-10 minutes (depends on replicas)
Graceful shutdown (SIGTERM): 30 seconds
Database migration       : 1-5 minutes
```

---

## 🆘 Emergency Commands

```bash
# Stop all pods in namespace (keep deployment)
kubectl scale deployment --all --replicas=0 -n myapp-production

# Restart all pods
kubectl rollout restart deployment --all -n myapp-production

# Force delete stuck pod
kubectl delete pod POD_NAME --grace-period=0 --force

# Emergency drain node (remove pods gracefully)
kubectl drain NODE_NAME

# Cordon node (prevent new pods, but don't evict existing)
kubectl cordon NODE_NAME

# Uncordon node
kubectl uncordon NODE_NAME
```

---

## 📚 Environment Variables

```bash
# Set default namespace
export KUBECONFIG=~/.kube/prod-config.yaml

# Set cluster context
kubectl config use-context myapp-prod

# Set namespace for all commands
kubectl config set-context --current --namespace=myapp-production

# Verify
kubectl config current-context
```

---

**Pro Tip**: Alias frequently used commands:
```bash
# Add to ~/.zshrc or ~/.bashrc
alias k=kubectl
alias kgp='kubectl get pods'
alias kdesc='kubectl describe'
alias klogs='kubectl logs -f'
alias kexec='kubectl exec -it'
alias kapp='kubectl apply'

# Now use:
k get pods
kgp -n myapp-production
klogs deployment/backend
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy | `kubectl apply -k platform/k8s/overlays/prod` |
| Scale | `kubectl scale deployment backend --replicas=5` |
| Logs | `kubectl logs -f deployment/backend` |
| Exec | `kubectl exec -it deployment/backend -- /bin/sh` |
| Port Forward | `kubectl port-forward svc/frontend 3000:80` |
| Rollback | `kubectl rollout undo deployment/backend` |
| Status | `kubectl rollout status deployment/backend` |
| Restart | `kubectl rollout restart deployment/backend` |
| Delete | `kubectl delete deployment backend` |
| Describe | `kubectl describe deployment backend` |
| Events | `kubectl get events --sort-by='.lastTimestamp'` |
| Resources | `kubectl top pods` |

---

Happy deploying! 🚀
