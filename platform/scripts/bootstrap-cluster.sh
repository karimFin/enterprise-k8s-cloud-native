#!/bin/bash
# ─── Cluster Bootstrap ────────────────────────────────────────
# Run this ONCE when setting up a new Kubernetes cluster.
# Installs all the cluster-level infrastructure:
#   - Nginx Ingress Controller
#   - cert-manager (automatic TLS)
#   - Prometheus + Grafana (monitoring)
#   - Metrics Server (required for HPA)
#
# Prerequisites:
#   - kubectl configured and pointing at your cluster
#   - helm installed

set -euo pipefail

echo "═══════════════════════════════════════════════"
echo "  Cluster Bootstrap Script"
echo "═══════════════════════════════════════════════"

# ─── 1. Metrics Server (required for HPA) ─────────────────────
echo ""
echo "📊 Installing Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
echo "✅ Metrics Server installed"

# ─── 2. Nginx Ingress Controller ──────────────────────────────
echo ""
echo "🌐 Installing Nginx Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true \
  --set controller.podAnnotations."prometheus\.io/port"=10254

echo "✅ Nginx Ingress Controller installed"

# ─── 3. cert-manager (Automatic TLS) ──────────────────────────
echo ""
echo "🔒 Installing cert-manager..."
helm repo add jetstack https://charts.jetstack.io

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Wait for cert-manager to be ready
kubectl wait --for=condition=available deployment/cert-manager \
  -n cert-manager --timeout=120s

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@myapp.example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
EOF

echo "✅ cert-manager installed with Let's Encrypt issuer"

# ─── 4. Prometheus + Grafana (Monitoring) ─────────────────────
echo ""
echo "📈 Installing Prometheus & Grafana..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false

echo "✅ Prometheus & Grafana installed"
echo "   Access Grafana: kubectl port-forward svc/monitoring-grafana 3001:80 -n monitoring"
echo "   Login: admin / admin"

echo ""
echo "🧾 Installing Loki..."
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.enabled=false \
  --set prometheus.enabled=false

echo "✅ Loki installed"

# ─── 5. Create application namespaces ─────────────────────────
echo ""
echo "📁 Creating application namespaces..."
for ns in myapp-dev myapp-production; do
  kubectl create namespace $ns --dry-run=client -o yaml | kubectl apply -f -
  echo "  Created: $ns"
done

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Cluster bootstrap complete!"
echo "═══════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Deploy the app:  kubectl apply -k platform/k8s/overlays/dev"
echo "  2. Check pods:      kubectl get pods -n myapp-dev"
echo "  3. Port forward:    kubectl port-forward svc/frontend 3000:80 -n myapp-dev"
echo "  4. View monitoring: kubectl port-forward svc/monitoring-grafana 3001:80 -n monitoring"
