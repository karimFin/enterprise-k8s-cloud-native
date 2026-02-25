resource "null_resource" "kind_dev_cluster" {
  count = var.enable_kind_dev ? 1 : 0

  triggers = {
    cluster_name = var.kind_cluster_name
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command = <<-EOT
      if ! kind get clusters | grep -qx "${var.kind_cluster_name}"; then
        kind create cluster --name "${var.kind_cluster_name}"
      fi
      kind export kubeconfig --name "${var.kind_cluster_name}" --kubeconfig "${var.kind_kubeconfig_path}"
      kubectl --kubeconfig "${var.kind_kubeconfig_path}" --context "kind-${var.kind_cluster_name}" apply -k "${path.module}/../k8s/overlays/dev"
    EOT
  }
}
