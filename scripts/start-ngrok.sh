#!/bin/bash

NGROK_CONFIG_FILE="../ngrok.yml"
# use ngrok config add-authtoken <token>
NGROK_USER_CONFIG_FILE="$HOME/Library/Application Support/ngrok/ngrok.yml"
NGROK_API_URL="http://localhost:4040/api/tunnels"

echo "Démarrage de ngrok..."

ngrok start --all --config="$NGROK_CONFIG_FILE,$NGROK_USER_CONFIG_FILE" > ngrok.log 2>&1 &
echo "En attente du démarrage complet de ngrok..."
sleep 8  # Augmentation du temps d'attente pour s'assurer que ngrok est prêt
