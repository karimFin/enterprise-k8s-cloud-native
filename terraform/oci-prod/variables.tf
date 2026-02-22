variable "region" {
  type = string
}

variable "oci_profile" {
  type    = string
  default = "DEFAULT"
}

variable "oci_config_path" {
  type    = string
  default = "~/.oci/config"
}

variable "compartment_ocid" {
  type = string
}

variable "cluster_name" {
  type    = string
  default = "myapp-prod-oke"
}

variable "kubernetes_version" {
  type = string
}

variable "vcn_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  type    = string
  default = "10.0.0.0/24"
}

variable "private_subnet_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

variable "node_pool_size" {
  type    = number
  default = 1
}

variable "node_pool_shape" {
  type    = string
  default = "VM.Standard.E4.Flex"
}

variable "node_pool_ocpus" {
  type    = number
  default = 1
}

variable "node_pool_memory_gbs" {
  type    = number
  default = 8
}

variable "ssh_public_key" {
  type = string
}

variable "node_os" {
  type    = string
  default = "Oracle Linux"
}

variable "node_os_version" {
  type    = string
  default = "8"
}

variable "node_image_id" {
  type    = string
  default = null
}

variable "cni_type" {
  type    = string
  default = "OCI_VCN_IP_NATIVE"
}

variable "kubeconfig_path" {
  type    = string
  default = "~/.kube/config"
}

variable "kubeconfig_context" {
  type    = string
  default = null
}

variable "enable_prod_deploy" {
  type    = bool
  default = false
}
