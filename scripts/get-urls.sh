#!/bin/sh

NGROK_API_URL="http://localhost:4040/api/tunnels"


echo "Récupération des URLs ngrok..."

curl -s "$NGROK_API_URL" | jq '.tunnels' || echo "Erreur lors de la récupération des tunnels, vérifiez que ngrok est en cours d'exécution"
FRONTEND_URL=$(curl -s "$NGROK_API_URL" | jq -r '.tunnels[] | select(.name=="frontend") | .public_url' 2>/dev/null)
BACKEND_URL=$(curl -s "$NGROK_API_URL" | jq -r '.tunnels[] | select(.name=="backend") | .public_url' 2>/dev/null)
KAFKA_URL=$(curl -s "$NGROK_API_URL" | jq -r '.tunnels[] | select(.name=="kafka-proxy") | .public_url' 2>/dev/null)

echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo "Kafka URL: $KAFKA_URL"
echo "export FRONTEND_URL=$FRONTEND_URL" > ../.env.ngrok.generated
echo "export VITE_SOCKET_URL=$BACKEND_URL" >> ../.env.ngrok.generated
echo "export VITE_KAFKA_PROXY_URL=$KAFKA_URL" >> ../.env.ngrok.generated