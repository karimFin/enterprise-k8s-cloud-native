#!/usr/bin/env bash
# =============================================================================
# Create a developer namespace with RBAC and resource quotas
#
# Usage: ./platform/scripts/create-dev-namespace.sh alice alice@company.com backend
# =============================================================================

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <developer-name> <email> [team]"
  echo "Example: $0 alice alice@company.com backend"
  exit 1
fi

DEV_NAME="$1"
DEV_EMAIL="$2"
TEAM="${3:-general}"
NAMESPACE="dev-${DEV_NAME}"

echo "📦 Creating namespace: ${NAMESPACE}"
echo "   Developer: ${DEV_EMAIL}"
echo "   Team: ${TEAM}"
echo ""

kubectl apply -f - << EOF
---
# Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE}
  labels:
    purpose: development
    developer: ${DEV_NAME}
    team: ${TEAM}
---
# Resource Quota — prevent any single dev from consuming too many resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: ${NAMESPACE}
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    pods: "20"
    services: "10"
    persistentvolumeclaims: "5"
    requests.storage: 20Gi
---
# LimitRange — set defaults so devs don't have to specify resources every time
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: ${NAMESPACE}
spec:
  limits:
    - type: Container
      default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "1"
        memory: 2Gi
    - type: PersistentVolumeClaim
      max:
        storage: 10Gi
---
# RoleBinding — give the developer edit access to their namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ${DEV_NAME}-edit
  namespace: ${NAMESPACE}
subjects:
  - kind: User
    name: ${DEV_EMAIL}
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: edit
  apiGroup: rbac.authorization.k8s.io
---
# NetworkPolicy — allow egress to internet and DNS, deny cross-namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dev-network-policy
  namespace: ${NAMESPACE}
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ${NAMESPACE}
  egress:
    - {}  # Allow all egress for dev convenience
EOF

echo ""
echo "✅ Namespace '${NAMESPACE}' created successfully!"
echo ""
echo "   The developer can now:"
echo "   kubectl config set-context --current --namespace=${NAMESPACE}"
echo "   kubectl apply -k platform/k8s/overlays/dev"
echo ""
echo "   Resource limits:"
echo "   CPU: 2 cores request / 4 cores limit"
echo "   Memory: 4Gi request / 8Gi limit"
echo "   Pods: 20 max"
