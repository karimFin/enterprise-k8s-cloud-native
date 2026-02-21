#!/usr/bin/env bash
set -euo pipefail

ORIGINAL_CONTEXT="$(kubectl config current-context)"
trap 'kubectl config use-context "$ORIGINAL_CONTEXT" >/dev/null' EXIT

DEV_CONTEXT="${DEV_CONTEXT:-}"
PROD_CONTEXT="${PROD_CONTEXT:-}"

if [ -n "$DEV_CONTEXT" ]; then
  kubectl config use-context "$DEV_CONTEXT" >/dev/null
fi

kubectl kustomize k8s/overlays/dev > /dev/null
kubectl apply -k k8s/overlays/dev
kubectl rollout status deployment/backend -n myapp-dev --timeout=300s
kubectl rollout status deployment/frontend -n myapp-dev --timeout=300s
kubectl exec -n myapp-dev deploy/backend -- wget -qO- http://127.0.0.1:8080/health

if [ -z "$PROD_CONTEXT" ]; then
  echo "Skipping prod: set PROD_CONTEXT to your prod kubecontext name"
  exit 0
fi

kubectl config use-context "$PROD_CONTEXT" >/dev/null
kubectl kustomize k8s/overlays/prod > /dev/null
kubectl apply -k k8s/overlays/prod
kubectl rollout status deployment/backend -n myapp-production --timeout=600s
kubectl rollout status deployment/frontend -n myapp-production --timeout=600s
kubectl exec -n myapp-production deploy/backend -- wget -qO- http://127.0.0.1:8080/health
