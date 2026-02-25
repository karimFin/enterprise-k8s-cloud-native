provider "oci" {
  config_file_profile = var.oci_profile
  config_file_path    = var.oci_config_path
  region              = var.region
}

provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kubeconfig_context
}

provider "helm" {
  kubernetes = {
    config_path    = var.kubeconfig_path
    config_context = var.kubeconfig_context
  }
}
