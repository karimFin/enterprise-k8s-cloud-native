output "vcn_id" {
  value = module.network.vcn_id
}

output "public_subnet_id" {
  value = module.network.public_subnet_id
}

output "private_subnet_id" {
  value = module.network.private_subnet_id
}

output "cluster_id" {
  value = module.oke.cluster_id
}

output "node_pool_id" {
  value = module.oke.node_pool_id
}
