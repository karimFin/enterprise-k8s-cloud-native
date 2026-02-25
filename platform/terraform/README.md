# Terraform Setup

This adds Terraform for cluster add-ons and namespaces.

## What it manages

- Namespaces: myapp-dev, myapp-production
- Optional Helm installs: ingress-nginx, cert-manager, metrics-server, monitoring

## Prerequisites

- Terraform installed
- kubectl configured for the target cluster

## Usage

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Enable add-ons

```bash
terraform apply -var="enable_ingress_nginx=true"
terraform apply -var="enable_cert_manager=true"
terraform apply -var="enable_metrics_server=true"
terraform apply -var="enable_monitoring=true"
```

## Use a specific kubecontext

```bash
terraform apply -var="kubeconfig_context=kind-myapp"
```
