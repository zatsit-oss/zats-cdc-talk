#!/bin/sh

echo "Démarrage du frontend..."

if [ ! -f ../.env.ngrok.generated ]; then
		echo "Fichier .env.ngrok.generated manquant."
		exit 1;
fi

VITE_SOCKET_URL=$(grep VITE_SOCKET_URL ../.env.ngrok.generated | cut -d '=' -f2-)
VITE_KAFKA_PROXY_URL=$(grep VITE_KAFKA_PROXY_URL ../.env.ngrok.generated | cut -d '=' -f2-)

echo "VITE_SOCKET_URL pour frontend: $VITE_SOCKET_URL"
echo "VITE_KAFKA_PROXY_URL pour frontend: $VITE_KAFKA_PROXY_URL"

cd ../package/frontend && VITE_SOCKET_URL=$VITE_SOCKET_URL VITE_KAFKA_PROXY_URL=$VITE_KAFKA_PROXY_URL npm run dev

frontend_pid=$!
echo "Frontend démarré avec PID: $frontend_pid"
