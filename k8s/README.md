# NipponBid — Kubernetes Setup

## Prerequisites
- minikube + kubectl installed
- Docker installed (to build images)
- helm v3 installed

---

## 1. Start minikube & enable addons

```bash
minikube start --cpus=4 --memory=6g
minikube addons enable ingress        # nginx ingress controller
minikube addons enable metrics-server # required for HPA
```

---

## 2. Build Docker images into minikube's registry

```bash
# Point your shell to minikube's Docker daemon
eval $(minikube docker-env)

# Build both images
docker build -f Dockerfile.frontend -t nipponbid-frontend:latest .
docker build -f Dockerfile.backend  -t nipponbid-backend:latest  .
```

---

## 3. Add hosts to /etc/hosts

```bash
echo "$(minikube ip)  nipponbid.local api.nipponbid.local" | sudo tee -a /etc/hosts
```

---

## Option A — Deploy with raw YAML files (apply in order)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets/secrets.yaml
kubectl apply -f k8s/database/service-headless.yaml
kubectl apply -f k8s/database/service-clusterip.yaml
kubectl apply -f k8s/database/statefulset.yaml
kubectl apply -f k8s/backend/service.yaml
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/hpa.yaml
kubectl apply -f k8s/frontend/service.yaml
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## Option B — Deploy with Helm (recommended)

```bash
# Install (first time)
helm install nipponbid ./helm

# Upgrade after changes
helm upgrade nipponbid ./helm

# Override a value at deploy time
helm upgrade nipponbid ./helm --set backend.replicas=3

# Uninstall everything
helm uninstall nipponbid
```

---

## Verify deployment

```bash
# Check all pods are Running
kubectl get pods -n nipponbid

# Check services
kubectl get svc -n nipponbid

# Check ingress
kubectl get ingress -n nipponbid

# Watch HPA scale in real time
kubectl get hpa -n nipponbid --watch

# View backend logs
kubectl logs -n nipponbid -l app=backend --tail=50 -f

# Shell into a pod
kubectl exec -it -n nipponbid deployment/backend -- sh
```

---

## Architecture

```
Internet
   │
   ▼
┌──────────────────────────────────────────────────────┐
│  Namespace: nipponbid                                │
│                                                      │
│  Ingress (nginx)                                     │
│  nipponbid.local ──────► frontend-service (LB :80)  │
│  api.nipponbid.local ──► backend-service (CIP :5000) │
│                                   │                  │
│  frontend pods (x2)               ▼                  │
│  ┌─────┐ ┌─────┐    backend pods (x2, HPA 2-8)      │
│  │ fe  │ │ fe  │    ┌─────────┐ ┌─────────┐         │
│  └─────┘ └─────┘    │ backend │ │ backend │         │
│  HPA: 2-6 pods       └────┬────┘ └────┬────┘         │
│                           │           │              │
│                    mysql-service (CIP :3306)         │
│                           │                          │
│              StatefulSet MySQL (x2)                  │
│         ┌──────────┐  ┌──────────┐                  │
│         │ mysql-0  │  │ mysql-1  │                  │
│         │ (primary)│  │(replica) │                  │
│         └──────────┘  └──────────┘                  │
│         mysql-headless (Headless — pod DNS)          │
│         PVC: 5Gi each (ReadWriteOnce)                │
└──────────────────────────────────────────────────────┘
```

## Component → Service type mapping

| Component | Service Type | Why |
|-----------|-------------|-----|
| Frontend | **LoadBalancer** | Needs external IP for browser access |
| Backend | **ClusterIP** | Only accessed via Ingress, never directly |
| MySQL primary | **ClusterIP** | Internal writes, backend pods connect here |
| MySQL pods | **Headless** | StatefulSet needs stable per-pod DNS names |
