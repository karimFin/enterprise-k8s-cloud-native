# Important Commands (Quick Reference)

## Local Development

```bash
docker compose up --build
docker compose down
docker compose logs -f
```

## Tests

```bash
cd services/backend && npm test
cd services/frontend && npm test
```

## Build Images

```bash
docker build -t myapp-backend:latest ./services/backend
docker build -t myapp-frontend:latest ./services/frontend
```

## Kubernetes (Dev)

```bash
kubectl apply -k platform/k8s/overlays/dev
kubectl rollout status deployment/backend -n myapp-dev --timeout=300s
kubectl rollout status deployment/frontend -n myapp-dev --timeout=300s
kubectl exec -n myapp-dev deploy/backend -- wget -qO- http://127.0.0.1:8080/health
```

## Port Forward (Local Access)

```bash
kubectl port-forward -n myapp-dev svc/frontend 3000:80
kubectl port-forward -n myapp-dev svc/backend 8080:80
```

## GitHub Actions (Local via act)

```bash
make act-test
GITHUB_TOKEN=YOUR_GHCR_TOKEN make act-build
GITHUB_TOKEN=YOUR_GHCR_TOKEN make act-deploy-dev
```

## GitHub Actions (Remote)

```bash
git push origin main
```

## Terraform

```bash
cd platform/terraform
terraform init
terraform plan
terraform apply
```

```bash
terraform apply -var="enable_ingress_nginx=true"
terraform apply -var="enable_cert_manager=true"
terraform apply -var="enable_metrics_server=true"
terraform apply -var="enable_monitoring=true"
```

## Useful Checks

```bash
kubectl get pods -n myapp-dev
kubectl describe pods -n myapp-dev -l app=frontend
kubectl logs -n myapp-dev -l app=frontend --tail=200
kubectl config current-context
```
