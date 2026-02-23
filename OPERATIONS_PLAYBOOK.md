# Operations Playbook

Professional, minimal-guesswork commands for day-to-day operations.

## Environment URLs

```bash
kubectl get svc frontend -n myapp-dev
kubectl get svc frontend -n myapp-production
```

## Deployments

```bash
make deploy-dev
make deploy-prod
```

```bash
kubectl rollout status deployment/backend -n myapp-dev
kubectl rollout status deployment/frontend -n myapp-dev
kubectl rollout status deployment/backend -n myapp-production
kubectl rollout status deployment/frontend -n myapp-production
```

## Sleep/Wake (Cost Control)

```bash
make sleep-cloud
make wake-cloud
```

## Quick Health Checks

```bash
kubectl get pods -n myapp-dev
kubectl get pods -n myapp-production
kubectl get events -n myapp-production --sort-by=.lastTimestamp | tail -n 20
```

## Logs

```bash
kubectl logs -f deployment/backend -n myapp-production
kubectl logs -f deployment/frontend -n myapp-production
```

## Rollback

```bash
kubectl rollout undo deployment/backend -n myapp-production
kubectl rollout undo deployment/frontend -n myapp-production
```

## Scale

```bash
kubectl scale deployment backend --replicas=2 -n myapp-dev
kubectl scale deployment frontend --replicas=2 -n myapp-dev
kubectl scale deployment backend --replicas=3 -n myapp-production
kubectl scale deployment frontend --replicas=3 -n myapp-production
```

## Debug Pod

```bash
kubectl get pods -n myapp-production
kubectl describe pod <pod-name> -n myapp-production
kubectl exec -it <pod-name> -n myapp-production -- sh
```

## Port Forward (No Public LB)

```bash
kubectl port-forward svc/frontend 3000:80 -n myapp-dev
kubectl port-forward svc/backend 8080:80 -n myapp-dev
```

## Monitoring (Grafana)

```bash
CONFIRM_APPLY=prod make monitoring-up
make monitoring-url
```

```bash
kubectl get secret -n monitoring monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 -d
```

## Terraform (OCI)

```bash
make tf-init-prod
make tf-plan-prod
CONFIRM_APPLY=prod make tf-apply-prod
```

```bash
make tf-plan-prod
CONFIRM_DESTROY=prod make tf-destroy-prod
```
