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
