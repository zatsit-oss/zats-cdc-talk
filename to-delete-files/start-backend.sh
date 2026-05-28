#!/bin/sh

echo "Démarrage du backend..."

if [ ! -f ../.env.ngrok.generated ]; then \
	echo "Fichier .env.ngrok.generated manquant."
	exit 1;
fi

FRONTEND_URL=$(grep FRONTEND_URL ../.env.ngrok.generated | cut -d '=' -f2-)

echo "FRONTEND_URL pour backend: $FRONTEND_URL"

cd ../package/backend && FRONTEND_URL=$FRONTEND_URL npm run dev &

backend_pid=$!

ps opgid= "$backend_pid"
echo "Backend démarré avec PID: $backend_pid"