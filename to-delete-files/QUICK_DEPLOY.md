# 🚀 Guide de déploiement rapide

## Étape 1 : Push du code (build automatique des images Docker)

```bash
# Vérifier que vous êtes sur la bonne branche
git checkout feat/deploy-to-clevercloud

# Commit et push (déclenche le build auto des images Docker)
git add .
git commit -m "Deploy to CleverCloud K8s"
git push origin feat/deploy-to-clevercloud
```

Attendez 2-3 minutes que GitHub Actions build les images.
Vérifiez sur : https://github.com/zatsit-oss/zats-cdc-talk/actions

## Étape 2 : Déployer sur Kubernetes

```bash
# Déployer la stack Kafka (si pas déjà fait)
make k8s-up

# Attendre que tout soit prêt
kubectl get pods

# Déployer frontend + backend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Vérifier le statut
kubectl get pods -l app=frontend
kubectl get pods -l app=backend
```

## Étape 3 : Obtenir l'URL publique

```bash
# Attendre que le LoadBalancer obtienne une IP (peut prendre 1-2 min)
kubectl get service frontend -w

# Une fois prêt, obtenir l'URL
kubectl get service frontend -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Votre application est accessible sur `http://<IP_PUBLIQUE>`

## 📊 Commandes utiles

```bash
# Voir les logs
kubectl logs -f -l app=backend
kubectl logs -f -l app=frontend

# Redémarrer après un update
kubectl rollout restart deployment/backend
kubectl rollout restart deployment/frontend

# Voir le statut complet
kubectl get all

# Supprimer l'application
kubectl delete -f k8s/backend-deployment.yaml
kubectl delete -f k8s/frontend-deployment.yaml
```

## 🔄 Mettre à jour l'application

```bash
# 1. Modifier votre code
# 2. Push (déclenche le rebuild auto)
git push

# 3. Attendre le build (2-3 min)
# 4. Redémarrer les pods pour utiliser la nouvelle image
kubectl rollout restart deployment/backend
kubectl rollout restart deployment/frontend
```

## ✅ Checklist

- [ ] Stack Kafka déployée (`kubectl get pods` montre kafka1, zoo1, etc.)
- [ ] Tests Kafka passent (`make k8s-test`)
- [ ] Code pushed sur GitHub
- [ ] GitHub Actions terminé avec succès
- [ ] Backend et frontend déployés
- [ ] LoadBalancer a une IP publique
- [ ] Application accessible depuis le navigateur

## 🐛 Troubleshooting

### Pods en CrashLoopBackOff

```bash
kubectl describe pod -l app=backend
kubectl logs -l app=backend --previous
```

### Images non trouvées

Vérifiez que les images sont publiques sur GitHub :
- Allez sur https://github.com/zatsit-oss/zats-cdc-talk/pkgs/container/zats-cdc-talk%2Fbackend
- Settings → "Change visibility" → "Public"

### Backend ne peut pas se connecter à Kafka

```bash
# Vérifier les variables d'environnement
kubectl exec -it deployment/backend -- env | grep KAFKA

# Doit afficher : KAFKA_BROKERS=kafka1:19092
```
