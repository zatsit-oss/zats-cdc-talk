#!/bin/bash

# Script to run the frontend locally with Docker
# Environment variables allow nginx to configure proxies correctly


# Build the frontend Docker image
echo "🏗️  Building frontend Docker image..."
docker build -t zats-frontend-local .

# Detect OS to use the correct hostname
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux: use host IP or network mode
    BACKEND_HOST="host.docker.internal:3000"
    KAFKA_REST_HOST="host.docker.internal:8082"
    EXTRA_FLAGS="--add-host=host.docker.internal:host-gateway"
else
    # macOS/Windows: host.docker.internal works natively
    BACKEND_HOST="host.docker.internal:3000"
    KAFKA_REST_HOST="host.docker.internal:8082"
    EXTRA_FLAGS=""
fi

# Start the container with environment variables for proxies
echo "🚀 Starting frontend on http://localhost:5173"
echo "   - Backend proxy: ${BACKEND_HOST}"
echo "   - Kafka REST proxy: ${KAFKA_REST_HOST}"
docker run -p 5173:8080 \
  -e BACKEND_HOST="${BACKEND_HOST}" \
  -e KAFKA_REST_HOST="${KAFKA_REST_HOST}" \
  --name zats-frontend \
  --rm \
  $EXTRA_FLAGS \
  zats-frontend-local
