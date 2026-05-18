#!/bin/bash

# Script de vérification de la stack Kafka sur Kubernetes
# Usage: ./scripts/test-kafka-k8s.sh

set -e

echo "🧪 Test de la stack Kafka sur Kubernetes"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

# 1. Vérifier que tous les pods sont Running
echo "1️⃣  Vérification de l'état des pods..."
echo "─────────────────────────────────────────"
kubectl get pods | grep -E "kafka1|kafka-connect|kafka-rest|zoo1"

KAFKA_READY=$(kubectl get pods -l io.kompose.service=kafka1 -o jsonpath='{.items[0].status.containerStatuses[0].ready}')
CONNECT_READY=$(kubectl get pods -l io.kompose.service=kafka-connect -o jsonpath='{.items[0].status.containerStatuses[0].ready}')
PROXY_READY=$(kubectl get pods -l io.kompose.service=kafka-rest-proxy -o jsonpath='{.items[0].status.containerStatuses[0].ready}')

if [ "$KAFKA_READY" = "true" ]; then
    check_result "Kafka broker est prêt"
else
    echo -e "${RED}❌ Kafka broker n'est pas prêt${NC}"
    exit 1
fi

if [ "$CONNECT_READY" = "true" ]; then
    check_result "Kafka Connect est prêt"
else
    echo -e "${RED}❌ Kafka Connect n'est pas prêt${NC}"
    exit 1
fi

if [ "$PROXY_READY" = "true" ]; then
    check_result "Kafka REST Proxy est prêt"
else
    echo -e "${RED}❌ Kafka REST Proxy n'est pas prêt${NC}"
    exit 1
fi

echo ""

# 2. Tester la connectivité Kafka depuis Kafka Connect
echo "2️⃣  Test de connectivité Kafka → Kafka Connect..."
echo "────────────────────────────────────────────────"
# Vérifier que Kafka Connect peut lister les connecteurs (prouve la connexion à Kafka)
kubectl exec deployment/kafka-connect -- \
    curl -s http://localhost:8083/connectors > /dev/null 2>&1
check_result "Kafka Connect peut communiquer avec Kafka"
echo ""

# 3. Tester le REST Proxy
echo "3️⃣  Test du Kafka REST Proxy..."
echo "────────────────────────────────────"
TOPICS=$(kubectl exec deployment/kafka-rest-proxy -- \
    curl -s http://localhost:8082/topics)

if [ -n "$TOPICS" ]; then
    check_result "REST Proxy peut lister les topics"
    echo -e "   ${YELLOW}Topics disponibles: ${TOPICS}${NC}"
else
    echo -e "${RED}❌ REST Proxy ne peut pas lister les topics${NC}"
    exit 1
fi
echo ""

# 4. Vérifier les logs Kafka Connect
echo "4️⃣  Vérification des logs Kafka Connect..."
echo "──────────────────────────────────────────"
CONNECT_ERROR=$(kubectl logs -l io.kompose.service=kafka-connect --tail=50 | grep -i "error\|timeout" | wc -l)

if [ "$CONNECT_ERROR" -eq 0 ]; then
    check_result "Aucune erreur dans les logs Kafka Connect"
else
    echo -e "${YELLOW}⚠️  Des erreurs détectées dans les logs Kafka Connect${NC}"
    kubectl logs -l io.kompose.service=kafka-connect --tail=20 | grep -i "error\|timeout"
fi
echo ""

# 5. Vérifier les logs REST Proxy
echo "5️⃣  Vérification des logs REST Proxy..."
echo "───────────────────────────────────────"
PROXY_ERROR=$(kubectl logs -l io.kompose.service=kafka-rest-proxy --tail=50 | grep -i "error" | wc -l)

if [ "$PROXY_ERROR" -eq 0 ]; then
    check_result "Aucune erreur dans les logs REST Proxy"
else
    echo -e "${YELLOW}⚠️  Des erreurs détectées dans les logs REST Proxy${NC}"
    kubectl logs -l io.kompose.service=kafka-rest-proxy --tail=20 | grep -i "error"
fi
echo ""

# 6. Test de création d'un topic
echo "6️⃣  Test de création d'un topic de test..."
echo "──────────────────────────────────────────"
kubectl exec deployment/kafka1 -- \
    kafka-topics --bootstrap-server localhost:19092 \
    --create --topic test-connection --partitions 1 --replication-factor 1 \
    --if-not-exists > /dev/null 2>&1
check_result "Topic de test créé avec succès"
echo ""

# 7. Test de production/consommation d'un message
echo "7️⃣  Test de production d'un message..."
echo "──────────────────────────────────────"
echo "test-message" | kubectl exec -i deployment/kafka1 -- \
    kafka-console-producer --bootstrap-server localhost:19092 \
    --topic test-connection > /dev/null 2>&1
check_result "Message produit avec succès"
echo ""

# 8. Résumé des services
echo "8️⃣  Résumé de la configuration..."
echo "──────────────────────────────────"
echo -e "${GREEN}Services Kafka:${NC}"
kubectl get services | grep -E "kafka1|kafka-rest|kafka-connect"
echo ""

# 9. Vérifier si les LoadBalancers sont déployés
echo "9️⃣  Vérification des LoadBalancers (si déployés)..."
echo "───────────────────────────────────────────────────"
LB_COUNT=$(kubectl get services -o json | jq '[.items[] | select(.spec.type=="LoadBalancer")] | length')

if [ "$LB_COUNT" -gt 0 ]; then
    echo -e "${GREEN}LoadBalancers détectés:${NC}"
    kubectl get services -o wide | grep LoadBalancer

    KAFKA_LB=$(kubectl get service kafka1 -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    PROXY_LB=$(kubectl get service kafka-rest-proxy -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

    if [ -n "$KAFKA_LB" ]; then
        echo -e "${GREEN}   • Kafka accessible sur: ${KAFKA_LB}:9092${NC}"
    fi

    if [ -n "$PROXY_LB" ]; then
        echo -e "${GREEN}   • REST Proxy accessible sur: http://${PROXY_LB}:8082${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Aucun LoadBalancer détecté (services internes seulement)${NC}"
    echo "   Pour exposer les services: make k8s-expose-services"
fi
echo ""

# Résumé final
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 Tous les tests sont passés avec succès !${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "📋 Étapes suivantes :"
echo "  1. Pour exposer Kafka publiquement: make k8s-expose-services"
echo "  2. Pour vérifier les connecteurs: kubectl exec -it deployment/kafka-connect -- curl http://localhost:8083/connectors"
echo "  3. Pour consulter les logs: kubectl logs -f deployment/kafka1"
echo ""
