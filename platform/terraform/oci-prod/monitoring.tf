resource "kubernetes_namespace_v1" "monitoring" {
  count = var.enable_monitoring ? 1 : 0

  metadata {
    name = "monitoring"
  }
}

locals {
  grafana_values = merge(
    {
      service = {
        type = "ClusterIP"
      }
    },
    var.grafana_admin_password == null ? {} : {
      adminPassword = var.grafana_admin_password
    }
  )
}

resource "helm_release" "monitoring" {
  count      = var.enable_monitoring ? 1 : 0
  name       = "monitoring"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace_v1.monitoring[0].metadata[0].name
  version    = var.monitoring_chart_version
  timeout    = 900

  values = [
    yamlencode({
      grafana = local.grafana_values
      prometheus = {
        prometheusSpec = {
          retention = var.prometheus_retention
        }
      }
    })
  ]
}

resource "helm_release" "loki" {
  count            = var.enable_loki ? 1 : 0
  name             = "loki"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki-stack"
  namespace        = try(kubernetes_namespace_v1.monitoring[0].metadata[0].name, "monitoring")
  version          = var.loki_chart_version
  timeout          = 900
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
