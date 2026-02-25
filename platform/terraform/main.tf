resource "kubernetes_namespace_v1" "app" {
  for_each = var.enable_k8s_namespaces ? toset(var.namespaces) : toset([])
  metadata {
    name = each.key
  }
}

resource "helm_release" "ingress_nginx" {
  count            = var.enable_ingress_nginx ? 1 : 0
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  set = [
    {
      name  = "controller.metrics.enabled"
      value = "true"
    },
    {
      name  = "controller.podAnnotations.prometheus\\.io/scrape"
      value = "true"
    },
    {
      name  = "controller.podAnnotations.prometheus\\.io/port"
      value = "10254"
    }
  ]
}

resource "helm_release" "cert_manager" {
  count            = var.enable_cert_manager ? 1 : 0
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  set = [
    {
      name  = "installCRDs"
      value = "true"
    }
  ]
}

resource "helm_release" "metrics_server" {
  count      = var.enable_metrics_server ? 1 : 0
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
}

resource "helm_release" "monitoring" {
  count            = var.enable_monitoring ? 1 : 0
  name             = "monitoring"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  set = [
    {
      name  = "grafana.adminPassword"
      value = "admin"
    },
    {
      name  = "prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues"
      value = "false"
    },
    {
      name  = "prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues"
      value = "false"
    }
  ]
}

resource "helm_release" "loki" {
  count            = var.enable_loki ? 1 : 0
  name             = "loki"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki-stack"
  namespace        = "monitoring"
  create_namespace = true
  values = [
    yamlencode({
      grafana = {
        enabled = false
      }
      prometheus = {
        enabled = false
      }
      promtail = {
        enabled = true
      }
    })
  ]
}
