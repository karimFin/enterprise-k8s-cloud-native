module "network" {
  source              = "./modules/network"
  compartment_ocid    = var.compartment_ocid
  vcn_cidr            = var.vcn_cidr
  public_subnet_cidr  = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
}

module "oke" {
  source                = "./modules/oke"
  compartment_ocid      = var.compartment_ocid
  tenancy_ocid          = var.tenancy_ocid
  cluster_name          = var.cluster_name
  kubernetes_version    = var.kubernetes_version
  vcn_id                = module.network.vcn_id
  endpoint_subnet_id    = module.network.public_subnet_id
  service_lb_subnet_ids = [module.network.public_subnet_id]
  node_pool_subnet_ids  = [module.network.private_subnet_id]
  node_pool_shape       = var.node_pool_shape
  node_pool_ocpus       = var.node_pool_ocpus
  node_pool_memory_gbs  = var.node_pool_memory_gbs
  node_pool_size        = var.node_pool_size
  ssh_public_key        = var.ssh_public_key
  node_os               = var.node_os
  node_os_version       = var.node_os_version
  node_image_id         = var.node_image_id
  cni_type              = var.cni_type
}

resource "null_resource" "deploy_prod" {
  count = var.enable_prod_deploy ? 1 : 0

  triggers = {
    cluster_id = module.oke.cluster_id
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      kubectl --context "${var.kubeconfig_context}" --kubeconfig "${var.kubeconfig_path}" apply -k "${path.module}/../../k8s/overlays/prod"
      kubectl --context "${var.kubeconfig_context}" --kubeconfig "${var.kubeconfig_path}" rollout status deployment/backend -n myapp-production --timeout=600s
      kubectl --context "${var.kubeconfig_context}" --kubeconfig "${var.kubeconfig_path}" rollout status deployment/frontend -n myapp-production --timeout=600s
      kubectl --context "${var.kubeconfig_context}" --kubeconfig "${var.kubeconfig_path}" exec -n myapp-production deploy/backend -- wget -qO- http://127.0.0.1:8080/health
    EOT
  }
}
