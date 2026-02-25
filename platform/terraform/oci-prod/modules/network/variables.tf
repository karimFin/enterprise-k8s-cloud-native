variable "compartment_ocid" {
  type = string
}

variable "vcn_cidr" {
  type = string
}

variable "public_subnet_cidr" {
  type = string
}

variable "private_subnet_cidr" {
  type = string
}

variable "vcn_name" {
  type    = string
  default = "myapp-prod-vcn"
}

variable "public_subnet_name" {
  type    = string
  default = "myapp-prod-public"
}

variable "private_subnet_name" {
  type    = string
  default = "myapp-prod-private"
}

variable "enable_nat_gateway" {
  type    = bool
  default = true
}
