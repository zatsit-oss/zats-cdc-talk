# 🚀 Déploiement complet de la stack sur CleverCloud Kubernetes

## 📋 Contexte

Ce document explique comment déployer **l'ensemble de l'application** (Frontend + Backend + Kafka) sur CleverCloud Kubernetes.

### Pourquoi cette approche ?

**Problème initial** : CleverCloud a un quota par défaut de **2 IPs publiques = 1 LoadBalancer** par organisation ([doc officielle](https://www.clever.cloud/developers/doc/kubernetes/#quotas-and-limits)). Déployer Kafka avec un LoadBalancer séparé génère une erreur 507.

**Solution optimale** : Déployer Frontend + Backend dans Kubernetes, avec :
- ✅ **1 seul LoadBalancer** pour exposer le Frontend publiquement
- ✅ **Accès direct** du Backend à Kafka via réseau interne (pas de LoadBalancer nécessaire)
- ✅ **Performance maximale** (réseau interne K8s)
- ✅ **Sécurité renforcée** (Kafka et Backend non exposés publiquement)

## 🏗️ Architecture

```
Internet (Utilisateurs)
    │
    │ HTTPS/HTTP
    │
    ▼
LoadBalancer Public (185.133.116.84)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│          CleverCloud Kubernetes Cluster                     │
│                                                              │
│   ┌──────────────┐                                          │
│   │  Frontend    │  Service: frontend (LoadBalancer)        │
│   │  React/Vite  │  Port: 80                                │
│   └──────┬───────┘                                          │
│          │ HTTP interne                                     │
│          ▼                                                   │
│   ┌──────────────┐                                          │
│   │   Backend    │  Service: backend (ClusterIP)           │
│   │  Node.js     │  Port: 3000                              │
│   └──────┬───────┘  KAFKA_BROKERS=kafka1:19092             │
│          │ Kafka Protocol (interne)                         │
│          ▼                                                   │
│   ┌──────────────┐                                          │
│   │   Kafka      │  Service: kafka1 (ClusterIP)            │
│   │   Broker     │  Port: 19092 (interne)                   │
│   └──────────────┘  Pas de LoadBalancer nécessaire !       │
│                                                              │
│   ┌──────────────┐                                          │
│   │ PostgreSQL   │  Service: postgresql (ClusterIP)        │
│   │   (CDC)      │  Port: 5432                              │
│   └──────────────┘                                          │
│                                                              │
│   ┌──────────────┐                                          │
│   │Kafka Connect │  Service: kafka-connect (ClusterIP)     │
│   │  (Debezium)  │  Port: 8083                              │
│   └──────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Avantages

| Critère | Approche K8s complète | Approche mixte (local + K8s) |
|---------|----------------------|------------------------------|
| **LoadBalancers nécessaires** | 1 seul ✅ | 2+ (❌ erreur 507) |
| **Quota IPs** | 2 IPs (quota par défaut) ✅ | 4+ IPs (quota++ requis) ❌ |
| **Performance** | Réseau interne ultra-rapide ✅ | Latence internet ❌ |
| **Sécurité** | Kafka non exposé ✅ | Kafka exposé publiquement ❌ |
| **Coûts** | Optimisés ✅ | LoadBalancers multiples ❌ |
| **Complexité** | Configuration initiale | Gestion multi-environnements |

## 📦 Prérequis

### 1. Stack Kafka déjà déployée

La stack Kafka (Kafka, Zookeeper, Connect, PostgreSQL) doit déjà être déployée dans K8s.

Vérification :
```bash
kubectl get pods
# Vous devez voir : kafka1, zoo1, kafka-connect, postgresql, etc.
```

### 2. Corrections appliquées

Le problème de connexion Kafka doit être résolu (voir [FIX_KAFKA_CONNECTION_K8S.md](./FIX_KAFKA_CONNECTION_K8S.md)).

Vérification :
```bash
make k8s-test
# Tous les tests doivent passer ✅
```

## 🔧 Étape 1 : Préparer les Dockerfiles

### Frontend Dockerfile

Créez `package/frontend/Dockerfile` :

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Créez `package/frontend/nginx.conf` :

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy vers le backend
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Backend Dockerfile

Créez `package/backend/Dockerfile` :

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## 🚀 Étape 2 : Build et Push des images Docker

### Option A : Build local et push vers Docker Hub

```bash
# Frontend
cd package/frontend
docker build -t votre-username/zats-frontend:latest .
docker push votre-username/zats-frontend:latest

# Backend
cd ../backend
docker build -t votre-username/zats-backend:latest .
docker push votre-username/zats-backend:latest
```

### Option B : Utiliser GitHub Container Registry

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build et push
docker build -t ghcr.io/zatsit-oss/zats-frontend:latest package/frontend
docker push ghcr.io/zatsit-oss/zats-frontend:latest

docker build -t ghcr.io/zatsit-oss/zats-backend:latest package/backend
docker push ghcr.io/zatsit-oss/zats-backend:latest
```

## ☸️ Étape 3 : Déployer sur Kubernetes

### Backend Deployment

Créez `k8s/backend-deployment.yaml` :

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  labels:
    app: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: votre-username/zats-backend:latest  # Remplacez par votre image
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: NODE_ENV
          value: "production"
        # PostgreSQL
        - name: DB_HOST
          value: "postgresql"
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          value: "postgres"
        - name: DB_PASSWORD
          value: "postgres"
        - name: DB_NAME
          value: "zats_cdc"
        # Kafka (accès direct interne !)
        - name: KAFKA_BROKERS
          value: "kafka1:19092"
        # CORS
        - name: FRONTEND_URL
          value: "http://frontend"
---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: ClusterIP  # Pas de LoadBalancer nécessaire !
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
```

### Frontend Deployment

Créez `k8s/frontend-deployment.yaml` :

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  labels:
    app: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: votre-username/zats-frontend:latest  # Remplacez par votre image
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: LoadBalancer  # Seul LoadBalancer nécessaire !
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

### Déployer

```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

## 🌐 Étape 4 : Obtenir l'URL publique

```bash
# Attendre que le LoadBalancer obtienne une IP
kubectl get service frontend -w

# Une fois prêt :
kubectl get service frontend
```

Vous obtiendrez une IP publique, par exemple `185.133.116.84`.

### Configurer un nom de domaine (optionnel)

Dans votre registrar DNS (OVH, Cloudflare, etc.), créez un enregistrement A :

```
Type: A
Nom: demo (ou frontend, ou @)
Valeur: 185.133.116.84
```

Accédez ensuite à `http://demo.votre-domaine.com`

## ✅ Étape 5 : Vérifier le déploiement

### 1. Vérifier les pods

```bash
kubectl get pods
```

Tous les pods doivent être `Running`.

### 2. Vérifier les services

```bash
kubectl get services
```

Vous devriez voir :
```
NAME         TYPE           EXTERNAL-IP        PORT(S)
frontend     LoadBalancer   185.133.116.84     80:xxxxx/TCP
backend      ClusterIP      10.x.x.x           3000/TCP
kafka1       ClusterIP      10.x.x.x           19092/TCP
```

### 3. Tester l'application

```bash
# Obtenir l'URL
FRONTEND_URL=$(kubectl get service frontend -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Frontend accessible sur: http://$FRONTEND_URL"

# Tester
curl http://$FRONTEND_URL
```

### 4. Vérifier les logs

```bash
# Logs backend
kubectl logs -f deployment/backend

# Logs frontend
kubectl logs -f deployment/frontend

# Logs Kafka
kubectl logs -f deployment/kafka1
```

## 🔄 Étape 6 : Mettre à jour l'application

```bash
# 1. Build nouvelle version
docker build -t votre-username/zats-backend:v2 package/backend
docker push votre-username/zats-backend:v2

# 2. Mettre à jour le deployment
kubectl set image deployment/backend backend=votre-username/zats-backend:v2

# 3. Suivre le rollout
kubectl rollout status deployment/backend
```

## 🐛 Troubleshooting

### Backend ne peut pas se connecter à Kafka

Vérifiez les variables d'environnement :
```bash
kubectl exec -it deployment/backend -- env | grep KAFKA
```

Doit afficher :
```
KAFKA_BROKERS=kafka1:19092
```

### Frontend ne peut pas atteindre le backend

Vérifiez la configuration nginx :
```bash
kubectl exec -it deployment/frontend -- cat /etc/nginx/conf.d/default.conf
```

### Pods en CrashLoopBackOff

```bash
# Voir les logs
kubectl logs deployment/backend --previous

# Décrire le pod
kubectl describe pod -l app=backend
```

## 📊 Monitoring et logs

### Logs en temps réel

```bash
# Tous les pods frontend
kubectl logs -f -l app=frontend

# Tous les pods backend
kubectl logs -f -l app=backend
```

### Métriques

```bash
# Utilisation CPU/RAM
kubectl top pods

# Détails d'un deployment
kubectl describe deployment backend
```

## 🔐 Sécurité

### Variables d'environnement sensibles

Utilisez des Secrets Kubernetes :

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DB_PASSWORD: "votre-mot-de-passe"
  KAFKA_SASL_PASSWORD: "votre-password-kafka"
```

Puis dans le deployment :
```yaml
env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: app-secrets
      key: DB_PASSWORD
```

### Network Policies

Limitez la communication entre pods :

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: kafka1
```

## 📋 Checklist de déploiement

- [ ] Stack Kafka déployée et fonctionnelle
- [ ] Tests Kafka passent (`make k8s-test`)
- [ ] Dockerfiles créés (frontend + backend)
- [ ] Images Docker buildées et pushées
- [ ] Deployments K8s créés et appliqués
- [ ] LoadBalancer obtenu une IP publique
- [ ] Frontend accessible depuis internet
- [ ] Backend peut se connecter à Kafka
- [ ] Application fonctionne end-to-end
- [ ] Nom de domaine configuré (optionnel)
- [ ] HTTPS configuré (optionnel - Ingress)

## 🎯 Résumé

Avec cette approche :
- ✅ **1 seul LoadBalancer** nécessaire (frontend)
- ✅ **Quota par défaut** suffisant (2 IPs)
- ✅ **Performance optimale** (réseau interne K8s)
- ✅ **Sécurité renforcée** (Kafka non exposé)
- ✅ **Architecture production-ready**

## 📚 Ressources

- [Documentation Kubernetes CleverCloud](https://www.clever.cloud/developers/doc/kubernetes/)
- [FIX_KAFKA_CONNECTION_K8S.md](./FIX_KAFKA_CONNECTION_K8S.md) - Correction du bug Kafka
- [README.md](./README.md) - Documentation principale du projet
