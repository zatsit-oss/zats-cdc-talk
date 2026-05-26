# Kubernetes — CDC Talk Stack

Ce dossier contient les manifests Kubernetes de la stack complète (Zookeeper, Kafka, Schema Registry, Kafka Connect, Kafka REST Proxy, PostgreSQL x2, Conduktor Console).

> Les fichiers ont été générés avec [kompose](https://kompose.io/) depuis `package/kafka/full-stack.yml`, puis corrigés manuellement.

---

## Démarrage

```bash
kubectl apply -f k8s/
```

### Ordre de démarrage des dépendances

```
zoo1
  └── kafka1
        ├── kafka-schema-registry
        │     ├── kafka-connect
        │     └── kafka-rest-proxy
        └── conduktor-console
postgresql
  └── conduktor-console
postgresql-pokesky   (source CDC Debezium)
```

Kubernetes gère les redémarrages automatiquement — les pods en `CrashLoopBackOff` au démarrage finissent par se stabiliser une fois leurs dépendances prêtes.

---

## Arrêt

```bash
kubectl delete -f k8s/
```

> ⚠️ Ne pas faire `kubectl delete pod <nom>` : le Deployment recrée immédiatement un nouveau pod. Il faut supprimer le Deployment lui-même (ou tout via `delete -f k8s/`).

---

## Recréer le cluster from scratch

```bash
# Lister les clusters
clever k8s list

# Supprimer le cluster
clever k8s delete <cluster-id-ou-nom>

# Recréer (ALL_IN_ONE par défaut, prêt en ~1 min)
clever k8s create <nom> --watch

# Récupérer le nouveau kubeconfig
clever k8s get-kubeconfig <nom> > ~/.kube/config

# Tout redéployer
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.7/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.7/docs/content/reference/dynamic-configuration/kubernetes-crd-rbac.yml
kubectl apply -f k8s/
```

## Accès aux services depuis le navigateur

Les services sont de type `ClusterIP` (internes au cluster). Pour y accéder en local, utiliser le **port-forward** :

| Service | Commande | URL |
|---|---|---|
| Conduktor Console | `kubectl port-forward svc/conduktor-console 8080:8080` | http://localhost:8080 |
| Kafka Connect API | `kubectl port-forward svc/kafka-connect 8083:8083` | http://localhost:8083 |
| Kafka REST Proxy | `kubectl port-forward svc/kafka-rest-proxy 8082:8082` | http://localhost:8082 |
| Schema Registry | `kubectl port-forward svc/kafka-schema-registry 8081:8081` | http://localhost:8081 |
| PostgreSQL Pokesky | `kubectl port-forward svc/postgresql-pokesky 5434:5434` | `localhost:5434` |

> Ajouter `&` à la fin pour lancer en arrière-plan : `kubectl port-forward svc/conduktor-console 8080:8080 &`

---

## Commandes utiles

### État des pods
```bash
kubectl get pods                        # liste tous les pods et leur statut
kubectl get pods -w                     # watch en temps réel
kubectl get deployments                 # liste les deployments
kubectl get svc                         # liste les services
kubectl get pvc                         # liste les volumes persistants
```

### Diagnostiquer un pod en erreur
```bash
kubectl describe pod <nom-du-pod>       # détails + Events (cause des erreurs)
kubectl logs <nom-du-pod>               # logs du conteneur
kubectl logs <nom-du-pod> --previous    # logs du conteneur avant un crash
kubectl logs -f <nom-du-pod>            # logs en temps réel (follow)
```

### Redémarrer un pod
```bash
kubectl rollout restart deployment <nom-du-deployment>
```

### Entrer dans un pod
```bash
kubectl exec -it <nom-du-pod> -- bash
```

### Appliquer une modification d'un seul fichier
```bash
kubectl apply -f k8s/kafka-connect-deployment.yaml
```

---

## Architecture réseau

Dans Kubernetes, les services se parlent via leur **nom DNS** (= le `name` du Service).
Exemple : `kafka-connect` contacte Kafka via `kafka1:19092`.

| Service | DNS interne | Port |
|---|---|---|
| Zookeeper | `zoo1` | 2181 |
| Kafka broker | `kafka1` | 19092 (interne) |
| Schema Registry | `kafka-schema-registry` | 8081 |
| Kafka Connect | `kafka-connect` | 8083 |
| Kafka REST Proxy | `kafka-rest-proxy` | 8082 |
| PostgreSQL (Conduktor) | `postgresql` | 5432 |
| PostgreSQL (Pokesky/CDC) | `postgresql-pokesky` | 5434 → 5432 |
| Conduktor Console | `conduktor-console` | 8080 |

---

## Persistence des données

> ⚠️ Les volumes ont été désactivés pour compatibilité avec les clusters locaux sans StorageClass configurée.

**Les données sont perdues au redémarrage des pods.** Pour réactiver la persistence, il faudra :
1. Configurer un `StorageClass` dans ton cluster local (ex: `minikube addons enable default-storageclass`)
2. Réajouter les `volumeMounts` et `volumes` dans les deployments concernés
3. Corriger le chemin PGDATA pour PostgreSQL : `/var/lib/postgresql/data`

---

## Traefik — Ingress Controller (URL fixe pour le frontend)

### Pourquoi Traefik ?

Actuellement le service `frontend` est de type `LoadBalancer` : Clever Cloud lui attribue une IP publique qui **change à chaque redémarrage du cluster**.

Avec Traefik :
- **Un seul** LoadBalancer (Traefik) absorbe tout le trafic entrant
- Le service `frontend` passe en `ClusterIP` (interne au cluster uniquement)
- Traefik route les requêtes vers le bon service selon des règles (`IngressRoute`)
- L'adresse publique à retenir est celle du LoadBalancer **Traefik**, plus stable car elle est indépendante des redémarrages des pods applicatifs

> **IPs publiques dédiées sur Clever Cloud** : contrairement à AWS ou GCP qui fournissent un DNS hostname (`.elb.amazonaws.com`, etc.), Clever Cloud assigne **2 adresses IP publiques dédiées** par service `LoadBalancer`. Ces IPs sont réservées à ton service et restent stables tant que le service existe — tu crées un enregistrement DNS `A` pointant directement vers elles.
>
> Récupère-les avec : `kubectl get svc traefik -o jsonpath='{.status.loadBalancer.ingress[*].ip}'`
>
> ⚠️ Par défaut, chaque organisation Clever Cloud dispose d'un quota de **2 IPs publiques** (= 1 seul `LoadBalancer`). Vérifie ta consommation avec `clever k8s quota`.

---

### Étape 1 — Installer les CRDs et le RBAC Traefik

Les Custom Resource Definitions (CRD) permettent d'utiliser les ressources `IngressRoute`, `Middleware`, etc.

```bash
# CRDs Traefik (IngressRoute, Middleware, TraefikService…)
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.7/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml

# RBAC (droits du ServiceAccount Traefik pour lire les ressources Kubernetes)
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.7/docs/content/reference/dynamic-configuration/kubernetes-crd-rbac.yml
```

---

### Étape 2 — Déployer Traefik

Créer le fichier `k8s/traefik-deployment.yaml` :

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: traefik
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traefik
  labels:
    app: traefik
spec:
  replicas: 1
  selector:
    matchLabels:
      app: traefik
  template:
    metadata:
      labels:
        app: traefik
    spec:
      serviceAccountName: traefik
      containers:
      - name: traefik
        image: traefik:v3.7
        args:
          - --providers.kubernetesCRD
          - --entryPoints.web.address=:80
        ports:
        - name: web
          containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: traefik
spec:
  type: LoadBalancer
  selector:
    app: traefik
  ports:
  - name: web
    port: 80
    targetPort: 80
    protocol: TCP
```

```bash
kubectl apply -f k8s/traefik-deployment.yaml
```

---

### Étape 3 — Modifier le service frontend

Dans `k8s/frontend-deployment.yaml`, changer le type du Service de `LoadBalancer` en `ClusterIP` :

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: ClusterIP   # <-- était LoadBalancer
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
```

```bash
kubectl apply -f k8s/frontend-deployment.yaml
```

---

### Étape 4 — Créer l'IngressRoute pour le frontend

Créer le fichier `k8s/traefik-ingressroute-frontend.yaml` :

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: frontend
spec:
  entryPoints:
    - web
  routes:
  - match: PathPrefix(`/`)
    kind: Rule
    services:
    - name: frontend
      port: 80
```

> Si tu disposes d'un nom de domaine, remplace `PathPrefix(`/`)` par `Host(`frontend.ton-domaine.com`)` pour ne router que les requêtes arrivant sur ce domaine.

```bash
kubectl apply -f k8s/traefik-ingressroute-frontend.yaml
```

---

### Étape 5 — Récupérer l'URL publique de Traefik

```bash
kubectl get svc traefik
```

La colonne `EXTERNAL-IP` affiche les **2 IPs publiques dédiées** assignées par Clever Cloud. Ce sont des IPs stables — pointe ton enregistrement DNS `A` vers l'une d'elles.

```bash
# Affichage lisible
kubectl get svc traefik

# Juste les IPs (pour scripting ou copier-coller)
kubectl get svc traefik -o jsonpath='{.status.loadBalancer.ingress[*].ip}'
```

---

### Étape 6 (optionnelle) — HTTPS avec Let's Encrypt

> **Prérequis** : un nom de domaine dont tu contrôles le DNS, pointant vers l'adresse externe de Traefik (enregistrement `A` vers l'IP ou `CNAME` vers le hostname DNS Clever Cloud).

Mettre à jour le Deployment Traefik pour activer Let's Encrypt (challenge HTTP-01) :

```yaml
containers:
- name: traefik
  image: traefik:v3.7
  args:
    - --providers.kubernetesCRD
    - --entryPoints.web.address=:80
    - --entryPoints.websecure.address=:443
    # Redirection HTTP → HTTPS
    - --entryPoints.web.http.redirections.entryPoint.to=websecure
    - --entryPoints.web.http.redirections.entryPoint.scheme=https
    # Let's Encrypt
    - --certificatesResolvers.letsencrypt.acme.httpChallenge=true
    - --certificatesResolvers.letsencrypt.acme.httpChallenge.entryPoint=web
    - --certificatesResolvers.letsencrypt.acme.email=ton-email@example.com   # ← à adapter
    - --certificatesResolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
  ports:
  - name: web
    containerPort: 80
  - name: websecure
    containerPort: 443
  volumeMounts:
  - name: letsencrypt
    mountPath: /letsencrypt
volumes:
- name: letsencrypt
  emptyDir: {}   # ⚠️ remplacer par un PVC (voir ci-dessous) pour ne pas perdre les certificats au redémarrage
```

> **Qu'est-ce qu'un PVC ?**
> Un **PVC** (PersistentVolumeClaim) est une demande de stockage persistant dans Kubernetes. Contrairement à `emptyDir` dont le contenu est effacé dès que le pod redémarre, un PVC survit aux redémarrages.
>
> Ici, sans PVC, Traefik perd le fichier `acme.json` (certificats Let's Encrypt) à chaque redémarrage et doit en redemander de nouveaux — ce qui est limité à **5 certificats par semaine** par domaine chez Let's Encrypt.
>
> Pour utiliser un PVC, créer d'abord `k8s/traefik-letsencrypt-pvc.yaml` :
> ```yaml
> apiVersion: v1
> kind: PersistentVolumeClaim
> metadata:
>   name: traefik-letsencrypt
> spec:
>   accessModes:
>     - ReadWriteOnce
>   resources:
>     requests:
>       storage: 128Mi
> ```
> Puis remplacer dans le Deployment :
> ```yaml
> volumes:
> - name: letsencrypt
>   persistentVolumeClaim:
>     claimName: traefik-letsencrypt
> ```

Ajouter le port `443` dans le Service `traefik` :

```yaml
ports:
- name: web
  port: 80
  targetPort: 80
- name: websecure
  port: 443
  targetPort: 443
```

Mettre à jour l'IngressRoute pour utiliser `websecure` :

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: frontend
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`frontend.ton-domaine.com`)
    kind: Rule
    services:
    - name: frontend
      port: 80
  tls:
    certResolver: letsencrypt
```

---

### Architecture réseau mise à jour avec Traefik

```
Internet
  └── Traefik (LoadBalancer — IP/hostname stable Clever Cloud)
        └── IngressRoute: PathPrefix(/) ou Host(...)
              └── frontend (ClusterIP — interne uniquement)
```
