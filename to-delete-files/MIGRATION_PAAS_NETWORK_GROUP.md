# Migration : Frontend PaaS Docker + Network Group → Backend K8s

## Objectif

Déployer le **frontend comme application PaaS Docker sur Clever Cloud** pour obtenir une URL stable `xxx.cleverapps.io` avec HTTPS gratuit, tout en permettant la communication avec le **backend Node.js qui reste dans le cluster Kubernetes (CKE)**, via un **Network Group** Clever Cloud (overlay WireGuard).

Cela permet également de **supprimer Traefik** du cluster K8s et de libérer le quota d'IP publiques (2 max sur le compte personnel).

---

## Architecture cible

```
Browser
  │  HTTPS
  ▼
Frontend (Clever Cloud PaaS — runtime Docker)
  zats-cdc-frontend.cleverapps.io
  nginx dans le container → proxy /socket.io et /kafka/
  │
  │  Network Group (WireGuard overlay, IP privées 10.101.0.x)
  ▼
Backend K8s (NodePort sur le nœud Kubernetes)
  node: 10.101.0.5 ("Rusty kabuto")
  nodePort: 30300 → pod backend:3000

(Kafka, PostgreSQL, etc. restent dans K8s, accessibles via le backend)
```

---

## État actuel du cluster (contexte pour l'agent)

| Élément | Valeur |
|---|---|
| Cluster Kubernetes | Clever Cloud CKE, `kubernetes_01KSGCTC8RXDYXPDTK90A3GYMG` |
| Topologie | ALL_IN_ONE, 1 nœud |
| Nœud K8s | `Rusty kabuto`, IP réseau interne `10.101.0.5` |
| Network Group | `ng_31ff0def-2c49-464d-be02-6dc56290b3e8` |
| Membres NG actuels | `10.101.0.5` (Rusty kabuto, Clever Peer), `10.101.0.6` et `10.101.0.7` (External Peers / LB), `10.101.0.8` (Cozy emboar, Clever Peer) |
| Quota IP publiques | 2 max → 1 seul LoadBalancer possible à la fois |
| Traefik actuel | LoadBalancer sur `185.133.116.78` et `185.133.116.95`, v3.7 |

Le cluster K8s **est déjà membre** du Network Group. Il n'y a pas besoin de l'y ajouter.

---

## Fichiers concernés

| Fichier | Rôle | Modifications requises |
|---|---|---|
| `package/frontend/nginx.conf` | Config nginx. Proxy `/socket.io` → `backend:3000`, `/kafka/` → `kafka-rest-proxy:8082`. Hostnames hardcodés (DNS K8s). | Remplacer les hostnames par des variables `${BACKEND_HOST}` et `${KAFKA_REST_HOST}` |
| `package/frontend/Dockerfile` | Multi-stage : build Vite → nginx:alpine. Copie `nginx.conf` comme config statique. | Copier comme template dans `/etc/nginx/templates/` pour activer `envsubst` automatique |
| `k8s/backend-deployment.yaml` | Backend Node.js/Socket.IO, service `ClusterIP` sur port `3000`. | Changer en `NodePort: 30300` |
| `k8s/kafka-rest-proxy-service.yaml` | Service kafka-rest-proxy, `ClusterIP` sur port `8082`. | Changer en `NodePort: 30082` |
| `k8s/traefik-deployment.yaml` | Ingress Traefik + LoadBalancer. | À **supprimer** après migration |
| `k8s/frontend-deployment.yaml` | Frontend dans K8s (ClusterIP). | À **supprimer** après migration |

---

## Mécanisme clé : `envsubst` dans nginx:alpine

L'image Docker officielle `nginx:alpine` (utilisée dans le `Dockerfile` existant) supporte nativement les templates depuis la version 1.19 :
- Les fichiers placés dans `/etc/nginx/templates/` avec l'extension `.template` sont automatiquement traités par `envsubst` au démarrage du container.
- Le résultat est écrit dans `/etc/nginx/conf.d/` avec le même nom sans `.template`.
- Les variables d'environnement du container sont substituées dans le fichier.

Il n'y a donc **pas besoin de script d'entrypoint personnalisé**.

---

## Étapes de migration

### Étape 1 — Modifier `nginx.conf` pour utiliser des variables d'environnement

Remplacer les hostnames hardcodés par des variables `envsubst` dans `package/frontend/nginx.conf` :

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://${BACKEND_HOST};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Kafka REST Proxy
    location /kafka/ {
        proxy_pass http://${KAFKA_REST_HOST}/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> `BACKEND_HOST` et `KAFKA_REST_HOST` seront injectés via les variables d'environnement Clever Cloud (ex. `10.101.0.5:30300`).

### Étape 2 — Modifier le `Dockerfile` pour utiliser le mécanisme de templates

Dans `package/frontend/Dockerfile`, changer la destination de copie de `nginx.conf` :

```dockerfile
# Avant :
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Après :
COPY nginx.conf /etc/nginx/templates/default.conf.template
```

Le `Dockerfile` complet résultant :

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY . .

RUN npm ci --production=false && npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Utilise le mécanisme de templates nginx pour envsubst
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Étape 3 — Exposer le backend en NodePort dans K8s

Modifier le service `backend` dans `k8s/backend-deployment.yaml` : changer `ClusterIP` en `NodePort` avec un port fixe.

```yaml
# Remplacer la section Service dans k8s/backend-deployment.yaml :
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: NodePort
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30300   # accessible sur 10.101.0.5:30300 via le Network Group
```

Faire de même pour `kafka-rest-proxy` dans `k8s/kafka-rest-proxy-service.yaml` :
```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka-rest-proxy
spec:
  type: NodePort
  selector:
    app: kafka-rest-proxy
  ports:
  - port: 8082
    targetPort: 8082
    nodePort: 30082   # accessible sur 10.101.0.5:30082 via le Network Group
```

Appliquer :
```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/kafka-rest-proxy-service.yaml
```

### Étape 4 — Créer l'application Docker sur Clever Cloud

Dans le dashboard Clever Cloud → Créer une application :
- **Type** : `Docker`
- **Région** : PAR (Paris) — même région que le cluster K8s
- **Nom** : ex. `zats-cdc-frontend`
- **URL obtenue** : `zats-cdc-frontend.cleverapps.io`

Variables d'environnement à configurer dans le dashboard Clever Cloud :
```
BACKEND_HOST=10.101.0.5:30300
KAFKA_REST_HOST=10.101.0.5:30082
CC_DOCKERFILE_PATH=package/frontend/Dockerfile
```

> `CC_DOCKERFILE_PATH` indique à Clever Cloud où trouver le Dockerfile dans le repo (le repo racine est cloné, pas seulement `package/frontend/`).

### Étape 5 — Ajouter l'app PaaS au Network Group

Dans la console Clever Cloud → Network Groups → `ng_31ff0def-2c49-464d-be02-6dc56290b3e8` → ajouter l'application `zats-cdc-frontend` comme membre.

Une fois ajoutée, le container nginx de l'app peut joindre `10.101.0.5:30300` (backend K8s) et `10.101.0.5:30082` (kafka-rest-proxy K8s).

### Étape 6 — Mettre à jour `FRONTEND_URL` dans le backend K8s

Dans `k8s/backend-deployment.yaml`, mettre à jour la variable CORS :
```yaml
- name: FRONTEND_URL
  value: "https://zats-cdc-frontend.cleverapps.io"
```

```bash
kubectl apply -f k8s/backend-deployment.yaml
```

### Étape 7 — Supprimer Traefik et le frontend K8s

Une fois le frontend PaaS vérifié fonctionnel :
```bash
kubectl delete -f k8s/traefik-deployment.yaml
kubectl delete -f k8s/traefik-ingressroute-frontend.yaml
kubectl delete -f k8s/frontend-deployment.yaml
```

Cela libère le LoadBalancer et le quota d'IP publiques.

---

## Points d'attention

- **NodePort range** : Kubernetes autorise les NodePorts entre `30000` et `32767`. Les ports `30300` et `30082` sont dans cette plage.
- **Firewall K8s sur CKE** : Vérifier que les NodePorts sont accessibles depuis le Network Group. Sur CKE le trafic intra-NG n'est pas bloqué par le firewall Clever Cloud, mais une Network Policy K8s pourrait l'être.
- **`envsubst` et variables nginx** : `envsubst` substitue **toutes** les variables shell dans le fichier, y compris les variables nginx comme `$uri`, `$host`, etc. Pour éviter qu'elles soient effacées, passer uniquement les variables à substituer en argument : `envsubst '${BACKEND_HOST} ${KAFKA_REST_HOST}'`. L'image nginx:alpine gère cela via la variable `NGINX_ENVSUBST_TEMPLATE_DIR` et `NGINX_ENVSUBST_OUTPUT_DIR`, ou en définissant `NGINX_ENVSUBST_FILTER`. **À tester** — si les variables nginx sont cassées, utiliser un entrypoint custom.
- **Sticky sessions** : Socket.IO nécessite du sticky routing en cas de plusieurs réplicas backend. Avec 1 seul replica (cas actuel), pas de problème.
- **CORS backend** : La variable `FRONTEND_URL` doit correspondre exactement à l'URL `cleverapps.io` (avec `https://`).
- **Build context Clever Cloud** : Clever Cloud clone le repo entier. Le `CC_DOCKERFILE_PATH` doit pointer vers le Dockerfile relatif à la racine du repo.

---

---

## Extension : Accès à Conduktor Console et PostgreSQL sans port-forward

### Contexte

Pour la démo, accéder à Conduktor Console (UI web) et aux bases PostgreSQL depuis le laptop sans `kubectl port-forward`. Deux approches possibles.

---

### Option A — Laptop comme External Peer (le plus simple)

**Principe** : ajouter le laptop directement dans le Network Group comme client WireGuard. Il obtient une IP `10.101.0.x` et peut joindre `10.101.0.5:3xxxx` (les NodePorts K8s) directement.

**Étapes** :

1. Dans la console Clever Cloud → Network Groups → `ng_31ff0def-2c49-464d-be02-6dc56290b3e8` → **Ajouter un External Peer** → récupérer la config WireGuard (clé publique/privée, endpoint, allowed IPs).

2. Installer WireGuard sur le laptop (macOS : `brew install wireguard-tools` ou app Wireguard depuis l'App Store).

3. Exposer les services en NodePort dans K8s :

```yaml
# conduktor-console-service.yaml — ajouter NodePort
spec:
  type: NodePort
  ports:
    - name: "8080"
      port: 8080
      targetPort: 8080
      nodePort: 30880   # → http://10.101.0.5:30880

# postgresql-service.yaml (DB Conduktor metadata)
spec:
  type: NodePort
  ports:
    - name: "5432"
      port: 5432
      targetPort: 5432
      nodePort: 30432   # → 10.101.0.5:30432

# postgresql-pokesky-service.yaml (DB applicative)
spec:
  type: NodePort
  ports:
    - name: "5432"
      port: 5432
      targetPort: 5432
      nodePort: 30433   # → 10.101.0.5:30433
```

```bash
kubectl apply -f k8s/conduktor-console-service.yaml
kubectl apply -f k8s/postgresql-service.yaml
kubectl apply -f k8s/postgresql-pokesky-service.yaml
```

4. Connecter le laptop au WireGuard et accéder directement :
   - Conduktor Console : `http://10.101.0.5:30880`
   - PostgreSQL Conduktor : `postgresql://10.101.0.5:30432`
   - PostgreSQL Pokesky : `postgresql://10.101.0.5:30433`

**Avantages** : aucun changement de code, tout reste dans K8s.
**Inconvénient** : nécessite WireGuard actif sur le laptop pendant la démo.

---

### Option B — Conduktor Console comme application PaaS Docker

**Principe** : déployer Conduktor Console comme application Docker sur Clever Cloud dans le Network Group. Elle obtient une URL stable `xxx.cleverapps.io`, accessible depuis n'importe quel navigateur sans VPN.

**Étapes** :

1. **Exposer Kafka en NodePort** (Conduktor PaaS ne peut pas utiliser le DNS K8s `kafka1`) :

```yaml
# kafka1-service.yaml — ajouter NodePort
spec:
  type: NodePort
  ports:
    - port: 19092
      targetPort: 19092
      nodePort: 30192   # → 10.101.0.5:30192 (interne NG)
```

```bash
kubectl apply -f k8s/kafka1-service.yaml
```

2. **Créer une application Docker** sur Clever Cloud :
   - Type : `Docker`
   - Image : `conduktor/conduktor-console:latest` (ou version fixée)
   - La définir comme membre du Network Group

3. **Variables d'environnement** sur l'app Clever Cloud (reprendre celles de `conduktor-console-deployment.yaml`, adapter les hostnames) :

```
CDK_CLUSTERS_0_BOOTSTRAPSERVERS=PLAINTEXT://10.101.0.5:30192
CDK_CLUSTERS_0_COLOR=#0013E7
CDK_CLUSTERS_0_NAME=kafka-k8s
CDK_DATABASE_URL=postgresql://user:password@10.101.0.5:30432/conduktor
# (ou URL d'un addon PostgreSQL Clever Cloud)
```

> Vérifier toutes les variables `CDK_*` dans `k8s/conduktor-console-deployment.yaml` et les adapter.

4. Ajouter l'app Conduktor au Network Group (même procédure que pour le frontend).

5. **Résultat** : `https://conduktor-console.cleverapps.io` — accessible depuis le navigateur sans VPN, avec HTTPS.

**Note base de données Conduktor** : la metadata DB de Conduktor (actuellement `postgresql` dans K8s) peut soit rester en K8s exposée en NodePort (Option A pour la DB), soit être migrée vers un addon PostgreSQL Clever Cloud. L'addon est recommandé si Conduktor Console sort du cluster.

---

### Option C — PostgreSQL sur addon Clever Cloud

Si l'on veut sortir les bases PostgreSQL de K8s complètement :

1. Créer deux addons PostgreSQL sur Clever Cloud (un pour Conduktor metadata, un pour `pokesky`).
2. Clever Cloud injecte automatiquement `POSTGRESQL_ADDON_URI` dans les apps liées à l'addon.
3. Mettre à jour `k8s/backend-deployment.yaml` avec les nouvelles coordonnées de connexion pour la DB `pokesky`.
4. Mettre à jour les variables `CDK_DATABASE_*` de Conduktor Console avec les coordonnées du nouvel addon.
5. Supprimer les déploiements `postgresql` et `postgresql-pokesky` de K8s → libère des ressources sur le cluster.

**Avantages** : base toujours accessible (pas de NodePort ni de VPN), backup automatique Clever Cloud, zéro ops.
**Inconvénient** : migration de données (dump/restore), coût de l'addon.

---

### Récapitulatif des options

| | Option A (External Peer) | Option B (Conduktor PaaS) | Option C (PostgreSQL addon) |
|---|---|---|---|
| Conduktor accessible | Via WireGuard laptop | URL stable `cleverapps.io` | N/A |
| PostgreSQL accessible | Via WireGuard laptop | Via NG NodePort ou addon | Toujours accessible |
| Changements K8s | NodePort sur 3 services | NodePort sur Kafka + DB | Supprimer 2 déploiements PG |
| WireGuard requis | Oui (démo) | Non | Non |
| Complexité | Faible | Moyenne | Moyenne |

**Recommandation pour la démo** : Option A pour un accès rapide sans migration + Option B pour Conduktor avec URL stable à montrer en démo.

---

## État d'avancement

- [x] Cluster K8s déployé sur Clever Cloud CKE
- [x] Backend K8s fonctionnel (ClusterIP, port 3000)
- [x] Cluster K8s déjà membre du Network Group `ng_31ff0def-...`
- [x] Traefik déployé et frontend accessible via LoadBalancer IP
- [ ] `nginx.conf` mis à jour avec variables `${BACKEND_HOST}` et `${KAFKA_REST_HOST}`
- [ ] `Dockerfile` mis à jour (copie vers `/etc/nginx/templates/`)
- [ ] Service `backend` changé en `NodePort: 30300`
- [ ] Service `kafka-rest-proxy` changé en `NodePort: 30082`
- [ ] Application Docker `zats-cdc-frontend` créée sur Clever Cloud
- [ ] App PaaS ajoutée au Network Group
- [ ] Variables d'environnement configurées sur Clever Cloud
- [ ] `FRONTEND_URL` mis à jour dans `backend-deployment.yaml`
- [ ] Frontend PaaS vérifié fonctionnel (HTTP + WebSocket)
- [ ] Traefik et frontend K8s supprimés
