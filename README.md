# zats-cdc-talk
Project to illustrate the CDC talk

## Getting Started

This project includes a full-stack application with a Kafka Connect stack, a frontend, and a backend. You can use the provided `Makefile` to manage and start the services easily.

### Prerequisites

Ensure you have the following installed on your system:
- Docker and Docker Compose
- Node.js and npm

### Available Commands

The `Makefile` provides the following commands:

- **Start Kafka Connect stack:**
  ```bash
  make connect
  ```
  This command starts the Kafka Connect stack using the `kafka/full-stack.yml` file.

- **Start Frontend:**
  ```bash
  make frontend
  ```
  This command installs dependencies and starts the frontend development server.

- **Start Backend:**
  ```bash
  make backend
  ```
  This command installs dependencies and starts the backend development server.

- **Start All Services:**
  ```bash
  make start
  ```
  This command starts the Kafka Connect stack, frontend, and backend.

- **Stop All Services:**
  ```bash
  make stop
  ```
  This command stops all running services.

### Notes

- Ensure that the `docker-compose` command is available in your terminal.
- The frontend and backend directories are located under the `package/` folder.
- Modify the `Makefile` if your directory structure or requirements differ.
