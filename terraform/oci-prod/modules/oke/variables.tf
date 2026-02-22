variable "compartment_ocid" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "kubernetes_version" {
  type = string
}

variable "vcn_id" {
  type = string
}

variable "endpoint_subnet_id" {
  type = string
}

variable "service_lb_subnet_ids" {
  type = list(string)
}

variable "node_pool_subnet_ids" {
  type = list(string)
}

variable "node_pool_shape" {
  type = string
}

variable "node_pool_ocpus" {
  type = number
}

variable "node_pool_memory_gbs" {
  type = number
}

variable "node_pool_size" {
  type = number
}

variable "ssh_public_key" {
  type = string
}

variable "node_os" {
  type = string
}

variable "node_os_version" {
  type = string
}

variable "node_image_id" {
  type    = string
  default = null
}

variable "cni_type" {
  type = string
}
