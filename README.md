# zats-cdc-talk
Project to illustrate the CDC talk

## Getting Started

This project includes a full-stack application with a Kafka Connect stack, a frontend, and a backend. You can use the provided `Makefile` to manage and start the services easily.

### Prerequisites

Ensure you have the following installed on your system:
- Docker and Docker Compose
- Node.js and npm

## Run it on your machine 🚀

### Starting the Kafka stack

The Kafka stack is defined in the [full-stack.yml](./package/kafka/full-stack.yml) file and contains:
- Kafka broker + Zookeeper
- Kafka Connect (Debezium PostgreSQL connector)
- Kafka REST Proxy (port 8082)
- Conduktor Console (http://localhost:8080)
- PostgreSQL (demo database)

To start it, simply run:
```bash
docker compose -f full-stack.yml up -d
```

### Starting the backend

The backend code is contained in the [backend package](./package/backend/)

To change the mode (DCD or CDC), you can modify the MODE environment variable in your .env file

To start the backend:

```bash
cd package/backend && npm i && npm run dev
```

### Starting the frontend

The frontend is dockerized for demo purposes, but don't worry, it's just as simple as the rest.
The frontend code is contained in the [frontend package](./package/frontend/)

To start the frontend:

```bash
cd package/frontend && ./start-frontend-local.sh
```

Once started, the application will be accessible at http://localhost:5173


### How to configure Kafka Connect and create a Postgresql connector ?

Kafka Connect is already available with the provided docker-compose file. You just need to run make start.

#### Database configuration

At startup, our Postgresql database is already with a wal level at `logical` which is the level required to work with Kafka Connect.
You can easily verify with the following command: `show wal_level;`

After this, you need to run some queries to make the heartbeat working:

```sql
CREATE TABLE IF NOT EXISTS public.kafka_connect_heartbeat
(
    name text COLLATE pg_catalog."default",
    count bigint,
    CONSTRAINT kafka_connect_heartbeat_pkey PRIMARY KEY (name)

);

INSERT INTO public.kafka_connect_heartbeat values ('kafka_connect_heartbeat',1);
```

> [!NOTE]
> By default, Kafka Connect only pushes data after the change. This means that the before field will be null and the after field will contain the updated data.
> To have both the before and after data, you must enable FULL replication on the table.
> To do this, execute this SQL line:
> ```sql
> ALTER TABLE "Post" REPLICA IDENTITY FULL;
> ```

#### How to add a Postgresql connector

You have two choices to achieve this.

1. With Conduktor Console

- Go to the Conduktor Console, by default http://localhost:8080
- Go to "Kafka Connect" on left menu
- Click on "full stack kafka connect"
- Click on "Add connector" on the top right corner
- Choose "Postgres Connector"
- On the top right corner, choose "raw" mode and paste the following configuration:

```json
{
  "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
  "database.hostname": "postgresql-pokesky",
  "database.port": "5432",
  "database.user": "pikachu",
  "database.password": "zatsit",
  "database.dbname": "pokesky",
  "database.server.name": "pokesky",
  "plugin.name": "pgoutput",
  "topic.prefix": "pokesky",
  "topic.heartbeat.prefix": "pokesky",
  "heartbeat.interval.ms": 10000,
  "heartbeat.action.query": "update public.kafka_connect_heartbeat set count=count+1 where name='kafka_connect_heartbeat'",
  "topic.creation.default.partitions": 1,
  "topic.creation.default.replication.factor": 1,
  "snapshot.mode": "never",
  "value.converter.schemas.enable": "false",
  "key.converter.schemas.enable": "false",
  "key.converter": "org.apache.kafka.connect.json.JsonConverter",
  "value.converter": "org.apache.kafka.connect.json.JsonConverter"
}
```
- Give a name for your connector (on the top) and validate the configuration
- Click on Next
- Review your config and click on Submit
- And 🎉

2. REST API

Kafka Connect also provides an API to manage connectors. You can find reference [here](https://docs.confluent.io/platform/current/connect/references/restapi.html)

To create a connector with API, you can:

Make a POST request to this endpoint: `http://localhost:8083/connectors`
And fill the body with the following content:
```json
{
  "name": "pokesky-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgresql-pokesky",
    "database.port": "5432",
    "database.user": "pikachu",
    "database.password": "zatsit",
    "database.dbname": "pokesky",
    "database.server.name": "pokesky",
    "plugin.name": "pgoutput",
    "topic.prefix": "pokesky",
    "topic.heartbeat.prefix": "pokesky",
    "heartbeat.interval.ms": 10000,
    "heartbeat.action.query": "update public.kafka_connect_heartbeat set count=count+1 where name='kafka_connect_heartbeat'",
    "topic.creation.default.partitions": 1,
    "topic.creation.default.replication.factor": 1,
    "snapshot.mode": "never",
    "value.converter.schemas.enable": "false",
    "key.converter.schemas.enable": "false",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}
```

To ensure your connector is running, you can hit `http://localhost:8083/connectors/:name/status` (replace `:name` by your connector's name)

And 🎉

### Notes

- Ensure that the `docker-compose` command is available in your terminal.
- The frontend and backend directories are located under the `package/` folder.


