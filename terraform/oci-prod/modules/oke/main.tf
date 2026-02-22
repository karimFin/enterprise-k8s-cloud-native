data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
}

data "oci_core_images" "node_images" {
  compartment_id           = coalesce(var.tenancy_ocid, var.compartment_ocid)
  operating_system         = var.node_os
  operating_system_version = var.node_os_version
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

locals {
  node_image_id = var.node_image_id != null ? var.node_image_id : try(data.oci_core_images.node_images.images[0].id, null)
}

resource "oci_containerengine_cluster" "this" {
  compartment_id     = var.compartment_ocid
  kubernetes_version = var.kubernetes_version
  name               = var.cluster_name
  vcn_id             = var.vcn_id
  cluster_pod_network_options {
    cni_type = var.cni_type
  }
  endpoint_config {
    is_public_ip_enabled = true
    subnet_id            = var.endpoint_subnet_id
  }
  options {
    service_lb_subnet_ids = var.service_lb_subnet_ids
  }
}

resource "oci_containerengine_node_pool" "this" {
  cluster_id         = oci_containerengine_cluster.this.id
  compartment_id     = var.compartment_ocid
  kubernetes_version = var.kubernetes_version
  name               = "${var.cluster_name}-pool"
  node_shape         = var.node_pool_shape
  node_shape_config {
    ocpus         = var.node_pool_ocpus
    memory_in_gbs = var.node_pool_memory_gbs
  }
  node_config_details {
    size = var.node_pool_size
    node_pool_pod_network_option_details {
      cni_type       = var.cni_type
      pod_subnet_ids = var.node_pool_subnet_ids
    }
    dynamic "placement_configs" {
      for_each = data.oci_identity_availability_domains.ads.availability_domains
      content {
        availability_domain = placement_configs.value.name
        subnet_id           = var.node_pool_subnet_ids[0]
      }
    }
  }
  node_source_details {
    image_id    = local.node_image_id
    source_type = "IMAGE"
  }
  ssh_public_key = var.ssh_public_key
  timeouts {
    delete = "120m"
  }
  lifecycle {
    precondition {
      condition     = local.node_image_id != null
      error_message = "No node image found. Set node_image_id or ensure tenancy_ocid/compartment_ocid has access to images for ${var.node_os} ${var.node_os_version}."
    }
  }
}
