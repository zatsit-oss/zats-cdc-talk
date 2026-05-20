Pour la démo via Clevercloud, des choses changent un peu.

Déjà pour avoir accès au frontend (changer dns?), database et conduktor console, il faut avoir un port forward sur chaque pod.

Une fois le port forward activé, on a accès aux 3 instances comme en local.

pour les changes sur la database c'est pareil
pour le setup du connecteur sur conduktor c'est pareil

par contre pour le backend c'est un peu différent. Il faut donc faire les changes sur le backend (changement du topic et changement de récupération de l'ID)
Une fois fait, deux possibilités :
- A/soit on utilise l'image backend-cdc:latest avec le code déjà modifié
- B/soit on pousse les changes pour construire l'image

A/ dans le fichier k8s/backend-deployment, on modifie la variable d'env MODE=CDC et l'image pull = ghcr.io/zatsit-oss/zats-cdc-talk/backend-cdc:latest
Ensuite on apply : kubectl apply -f k8s/backend-deployment.yaml
Normalement le pod restart sur le mode CDC

B/ on modifie le workflow build-and-push, dans les var d'env : BACKEND_IMAGE: ghcr.io/${{ github.repository }}/backend-cdc
Ensuite : git add . && git commit -m ":rocket: let's go !" && git commit push origin main
On attend 2min la pipeline
On reprend comme A/

