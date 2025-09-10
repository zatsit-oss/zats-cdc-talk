# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_FILE = package/kafka/full-stack.yml
FRONTEND_DIR = package/frontend
BACKEND_DIR = package/backend

# Targets
.PHONY: all connect frontend backend start stop

all: start

connect:
	@echo "Starting Kafka Connect stack..."
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d --build

frontend:
	@echo "Starting frontend..."
	cd $(FRONTEND_DIR) && npm install && npm run dev &

backend:
	@echo "Starting backend..."
	cd $(BACKEND_DIR) && npm install && npm run dev

start: connect frontend backend
	@echo "All services started."

stop:
	@echo "Stopping all services..."
	$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v
	@echo "All services stopped."
