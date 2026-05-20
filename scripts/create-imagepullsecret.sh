#!/bin/bash
# Script pour créer un ImagePullSecret pour GitHub Container Registry

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Création d'un ImagePullSecret pour GitHub Container Registry${NC}"
echo ""

# Vérifier si le secret existe déjà
if kubectl get secret github-registry &> /dev/null; then
    echo -e "${YELLOW}⚠️  Le secret 'github-registry' existe déjà${NC}"
    read -p "Voulez-vous le recréer ? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete secret github-registry
        echo -e "${GREEN}✅ Secret supprimé${NC}"
    else
        echo -e "${YELLOW}Annulé${NC}"
        exit 0
    fi
fi

# Demander les informations
echo ""
echo "Créez un Personal Access Token sur GitHub :"
echo "https://github.com/settings/tokens/new"
echo "Scope requis : read:packages"
echo ""

read -p "GitHub username : " GITHUB_USERNAME
read -sp "GitHub Personal Access Token : " GITHUB_TOKEN
echo ""
read -p "Email : " GITHUB_EMAIL

# Créer le secret
echo ""
echo -e "${GREEN}Création du secret...${NC}"
kubectl create secret docker-registry github-registry \
  --docker-server=ghcr.io \
  --docker-username="$GITHUB_USERNAME" \
  --docker-password="$GITHUB_TOKEN" \
  --docker-email="$GITHUB_EMAIL"

echo ""
echo -e "${GREEN}✅ Secret créé avec succès !${NC}"
echo ""
echo "Prochaines étapes :"
echo "1. Vérifier : kubectl get secret github-registry"
echo "2. Les deployments utilisent déjà 'imagePullSecrets'"
echo "3. Redémarrer : kubectl rollout restart deployment/backend deployment/frontend"
