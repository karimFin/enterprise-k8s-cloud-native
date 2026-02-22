output "namespaces" {
  value = var.enable_k8s_namespaces ? keys(kubernetes_namespace_v1.app) : []
}
