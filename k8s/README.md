# Kubernetes — CDC Talk Stack

This folder contains the Kubernetes manifests for the complete stack (Zookeeper, Kafka, Schema Registry, Kafka Connect, Kafka REST Proxy, PostgreSQL x2, Conduktor Console, Backend).

> The files were generated with [kompose](https://kompose.io/) from `package/kafka/full-stack.yml`, then manually corrected.

---

## Quick Start

```bash
kubectl apply -f k8s/
```

### Dependency Startup Order

```
zoo1
  └── kafka1
        ├── kafka-schema-registry
        │     ├── kafka-connect
        │     └── kafka-rest-proxy
        └── conduktor-console
postgresql
  └── conduktor-console
postgresql-pokesky   (Debezium CDC source)
backend
```

Kubernetes handles restarts automatically — pods in `CrashLoopBackOff` at startup eventually stabilize once their dependencies are ready.

---

## Shutdown

```bash
kubectl delete -f k8s/
```

> ⚠️ Don't do `kubectl delete pod <name>`: the Deployment immediately recreates a new pod. You need to delete the Deployment itself (or everything via `delete -f k8s/`).

---

## Recreate Cluster from Scratch

```bash
# List clusters
clever k8s list

# Delete cluster
clever k8s delete <cluster-id-or-name>

# Recreate (ALL_IN_ONE by default, ready in ~1 min)
clever k8s create <name> --watch

# Get the new kubeconfig
clever k8s get-kubeconfig <name> > ~/.kube/config

kubectl apply -f k8s/
```

---

## Accessing Services from Browser

Services are of type `ClusterIP` (internal to the cluster). To access them locally, use **port-forward**:

| Service | Command | URL |
|---|---|---|
| Conduktor Console | `kubectl port-forward svc/conduktor-console 8080:8080` | http://localhost:8080 |
| Kafka Connect API | `kubectl port-forward svc/kafka-connect 8083:8083` | http://localhost:8083 |
| Kafka REST Proxy | `kubectl port-forward svc/kafka-rest-proxy 8082:8082` | http://localhost:8082 |
| Schema Registry | `kubectl port-forward svc/kafka-schema-registry 8081:8081` | http://localhost:8081 |
| PostgreSQL Pokesky | `kubectl port-forward svc/postgresql-pokesky 5434:5434` | `localhost:5434` |

> Add `&` at the end to launch in background: `kubectl port-forward svc/conduktor-console 8080:8080 &`

---

## Useful Commands

### Pod Status
```bash
kubectl get pods                        # list all pods and their status
kubectl get pods -w                     # watch in real-time
kubectl get deployments                 # list deployments
kubectl get svc                         # list services
kubectl get pvc                         # list persistent volumes
```

### Diagnose a Failed Pod
```bash
kubectl describe pod <pod-name>         # details + Events (error causes)
kubectl logs <pod-name>                 # container logs
kubectl logs <pod-name> --previous      # logs from container before a crash
kubectl logs -f <pod-name>              # logs in real-time (follow)
```

### Restart a Pod
```bash
kubectl rollout restart deployment <deployment-name>
```

### Enter a Pod
```bash
kubectl exec -it <pod-name> -- bash
```

### Apply a Single File Modification
```bash
kubectl apply -f k8s/kafka-connect-deployment.yaml
```

---

## Network Architecture

In Kubernetes, services communicate via their **DNS name** (= the Service's `name`).
Example: `kafka-connect` contacts Kafka via `kafka1:19092`.

| Service | Internal DNS | Port |
|---|---|---|
| Zookeeper | `zoo1` | 2181 |
| Kafka broker | `kafka1` | 19092 (internal) |
| Schema Registry | `kafka-schema-registry` | 8081 |
| Kafka Connect | `kafka-connect` | 8083 |
| Kafka REST Proxy | `kafka-rest-proxy` | 8082 |
| PostgreSQL (Conduktor) | `postgresql` | 5432 |
| PostgreSQL (Pokesky/CDC) | `postgresql-pokesky` | 5434 → 5432 |
| Conduktor Console | `conduktor-console` | 8080 |
| Backend | `backend` | 3000 |

---

## Data Persistence

The following PersistentVolumeClaims are configured for data persistence:

- `conduktor-data-persistentvolumeclaim.yaml` — Conduktor Console data
- `kafka-connect-claim0-persistentvolumeclaim.yaml` — Kafka Connect data
- `pg-data-persistentvolumeclaim.yaml` — PostgreSQL (Conduktor) data
- `pg-data-pokesky-persistentvolumeclaim.yaml` — PostgreSQL (Pokesky/CDC) data

> Note: Ensure your cluster has a configured StorageClass for automatic volume provisioning. For local clusters (e.g., minikube), enable with: `minikube addons enable default-storageclass`

---

## Files in this Directory

**Core Infrastructure:**
- `zoo1-deployment.yaml`, `zoo1-service.yaml` — Zookeeper
- `kafka1-deployment.yaml`, `kafka1-service.yaml` — Kafka broker
- `kafka-schema-registry-deployment.yaml`, `kafka-schema-registry-service.yaml` — Schema Registry
- `kafka-connect-deployment.yaml`, `kafka-connect-service.yaml` — Kafka Connect
- `kafka-rest-proxy-deployment.yaml`, `kafka-rest-proxy-service.yaml` — Kafka REST Proxy

**Databases:**
- `postgresql-deployment.yaml`, `postgresql-service.yaml` — PostgreSQL (Conduktor)
- `postgresql-pokesky-deployment.yaml`, `postgresql-pokesky-service.yaml` — PostgreSQL (Pokesky/CDC source)

**Applications:**
- `conduktor-console-deployment.yaml`, `conduktor-console-service.yaml` — Conduktor Console
- `backend-deployment.yaml` — Backend application

**Persistent Volumes:**
- `conduktor-data-persistentvolumeclaim.yaml`
- `kafka-connect-claim0-persistentvolumeclaim.yaml`
- `pg-data-persistentvolumeclaim.yaml`
- `pg-data-pokesky-persistentvolumeclaim.yaml`
