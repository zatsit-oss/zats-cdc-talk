#!/bin/bash

read -p "Name of CKE cluster: " CKE_CLUSTER_NAME

# Recréer (ALL_IN_ONE par défaut, prêt en ~1 min)
clever k8s create "$CKE_CLUSTER_NAME" --watch

# Récupérer le nouveau kubeconfig
clever k8s get-kubeconfig "$CKE_CLUSTER_NAME" > ~/.kube/config

# Script pour créer un ImagePullSecret pour GitHub Container Registry
./scripts/create-imagepullsecret.sh

# Tout redéployer
kubectl apply -f k8s/

read -p "AppID of the frontend on Clever Cloud: " FRONTEND_APP_ID

# Récupérer l'ID du Network Group
NETWORK_GROUP_ID=$(clever ng -F json | jq -r '.[0].id')

# Link le frontend au Network Group pour qu'il puisse accéder au backend et au Kafka REST Proxy
clever ng link "$FRONTEND_APP_ID" "$NETWORK_GROUP_ID"

# Démarrer le frontend sur Clever Cloud
clever restart --app "$FRONTEND_APP_ID"