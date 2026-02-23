variable "kubeconfig_path" {
  type    = string
  default = "~/.kube/config"
}

variable "kubeconfig_context" {
  type    = string
  default = null
}

variable "namespaces" {
  type    = list(string)
  default = ["myapp-dev", "myapp-production"]
}

variable "enable_ingress_nginx" {
  type    = bool
  default = false
}

variable "enable_cert_manager" {
  type    = bool
  default = false
}

variable "enable_metrics_server" {
  type    = bool
  default = false
}

variable "enable_monitoring" {
  type    = bool
  default = false
}

variable "cert_manager_email" {
  type    = string
  default = "admin@myapp.example.com"
}

variable "enable_k8s_namespaces" {
  type    = bool
  default = false
}

variable "enable_kind_dev" {
  type    = bool
  default = false
}

variable "kind_cluster_name" {
  type    = string
  default = "myapp-dev"
}

variable "kind_kubeconfig_path" {
  type    = string
  default = ".kubeconfig-kind-dev"
}
