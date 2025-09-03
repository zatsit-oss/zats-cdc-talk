#!/bin/bash

# Aller dans le répertoire frontend
cd "$(dirname "$0")/package/frontend"

# Démarrer le frontend en arrière-plan avec les variables d'environnement de ngrok
echo "Démarrage du frontend avec configuration ngrok..."
VITE_ENV=.env.ngrok npm run dev -- --host &
FRONTEND_PID=$!

# Attendre que le serveur frontend démarre
echo "Attente du démarrage du frontend..."
sleep 3

# Démarrer ngrok pour exposer le frontend
echo "Exposition du frontend via ngrok..."
ngrok http 5173

# Capturer Ctrl+C pour arrêter proprement
trap 'kill $FRONTEND_PID; exit' INT

# Attendre que ngrok se termine
wait $FRONTEND_PID