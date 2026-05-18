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
