# DevOps Beginner Guide (Real Examples + Diagrams)

## Terraform vs Kubernetes

Terraform creates the infrastructure in the cloud, and Kubernetes runs the application on that infrastructure.

## Technical Flow

- Terraform provisions the OCI network and the OKE Kubernetes cluster.
- Kubernetes manifests describe the app workloads (frontend, backend, database) and services.
- Kustomize overlays apply environment-specific differences (dev, prod).
- CI builds container images and deploys them into the correct namespace.
- Kubernetes controllers keep the desired number of pods running and healthy.

## Why This Separation

- Terraform manages cloud resources that live outside the cluster.
- Kubernetes manages workloads that live inside the cluster.
- Keeping them separate makes changes safer, testable, and repeatable.

## Real Example: Adding Monitoring

Terraform change (enables monitoring add-on):

```hcl
# platform/terraform/oci-prod/terraform.tfvars
enable_monitoring = true
```

Apply to update the cluster:

```bash
CONFIRM_APPLY=prod make monitoring-up
```

Kubernetes then schedules the monitoring pods in the `monitoring` namespace.

## Real Example: Scale Backend in Dev

Kubernetes overlay change (dev environment only):

```yaml
# platform/k8s/overlays/dev/kustomization.yaml
patches:
  - patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: backend
      spec:
        replicas: 2
```

Apply it:

```bash
kubectl apply -k platform/k8s/overlays/dev
```

Kubernetes creates an extra backend pod and keeps it running.

## Diagram: What Runs Where

```text
Cloud (OCI)
└─ OKE Cluster (Kubernetes)
   ├─ Namespace: myapp-dev
   │  ├─ frontend Deployment
   │  ├─ backend Deployment
   │  └─ postgres StatefulSet
   ├─ Namespace: myapp-production
   │  ├─ frontend Deployment
   │  ├─ backend Deployment
   │  └─ postgres StatefulSet
   └─ Namespace: monitoring
      ├─ prometheus
      └─ grafana
```

## Diagram: Change Flow (Infra vs App)

```text
Change Terraform (infra)        Change Kubernetes (app)
------------------------        ------------------------
platform/terraform/oci-prod     platform/k8s/base + platform/k8s/overlays
        |                                 |
terraform apply                    kubectl apply -k
        |                                 |
Creates cluster/ingress         Updates deployments/services
```
