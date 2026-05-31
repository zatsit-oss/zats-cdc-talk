
#!/bin/bash


# Demander si déploiement sur organisation ou espace personnel
read -p "Déployer sur une organisation Clever Cloud ? (y/n): " IS_ORG
if [[ "$IS_ORG" =~ ^[Yy]$ ]]; then
	read -p "ID de l'organisation Clever Cloud: " ORGA_ID
	ORG_FLAG="--org $ORGA_ID"
	echo "Déploiement sur l'organisation $ORGA_ID."
else
	ORG_FLAG=""
	echo "Déploiement sur l'espace personnel."
fi

read -p "Name of CKE cluster: " CKE_CLUSTER_NAME


# Recréer (ALL_IN_ONE par défaut, prêt en ~1 min)
clever k8s create $ORG_FLAG "$CKE_CLUSTER_NAME" --watch


# Récupérer le nouveau kubeconfig
clever k8s get-kubeconfig $ORG_FLAG "$CKE_CLUSTER_NAME" > ~/.kube/config


# Script pour créer un ImagePullSecret pour GitHub Container Registry
./scripts/create-imagepullsecret.sh


# Tout redéployer
kubectl apply -f k8s/


read -p "AppID of the frontend on Clever Cloud: " FRONTEND_APP_ID


# Récupérer l'ID du Network Group
if [[ -n "$ORG_FLAG" ]]; then
	NETWORK_GROUP_ID=$(clever ng $ORG_FLAG -F json | jq -r '.[0].id')
else
	NETWORK_GROUP_ID=$(clever ng -F json | jq -r '.[0].id')
fi


# Link le frontend au Network Group pour qu'il puisse accéder au backend et au Kafka REST Proxy
if [[ -n "$ORG_FLAG" ]]; then
	clever ng link $ORG_FLAG "$FRONTEND_APP_ID" "$NETWORK_GROUP_ID"
else
	clever ng link "$FRONTEND_APP_ID" "$NETWORK_GROUP_ID"
fi


# Démarrer le frontend sur Clever Cloud
clever restart --app "$FRONTEND_APP_ID"