# Variables
DOCKER_COMPOSE = $(shell command -v docker-compose >/dev/null 2>&1 && echo docker-compose || echo docker compose)
DOCKER_COMPOSE_FILE = package/kafka/full-stack.yml
FRONTEND_DIR = package/frontend
BACKEND_DIR = package/backend
SCRIPTS_DIR = scripts

# Targets
.PHONY: all connect frontend backend start stop

all: start

connect:
	@echo "Starting Kafka Connect stack..."
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d --build

frontend:
	@echo "Starting frontend..."
	cd $(SCRIPTS_DIR) && ./start-frontend.sh

backend:
	@echo "Starting backend..."
	cd $(SCRIPTS_DIR) && ./start-backend.sh

ngrok:
	@echo "Starting ngrok..."
	cd $(SCRIPTS_DIR) && ./start-ngrok.sh

get-ngrok-urls:
	@echo "Retrieving ngrok URLs..."
	cd $(SCRIPTS_DIR) && ./get-urls.sh

start: connect ngrok get-ngrok-urls backend frontend
	@echo "All services started."

stop:
	@echo "Stopping all services..."
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v
	@echo "All services stopped."
