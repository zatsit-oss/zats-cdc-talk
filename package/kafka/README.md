# Kafka Stack

> Base Conduktor stack : https://github.com/conduktor/kafka-stack-docker-compose/tree/master

## Développement local (stack complète)

```bash
docker compose -f full-stack.yml up -d
docker compose -f full-stack.yml down -v
```

**Contient** :
- Kafka broker + Zookeeper
- Kafka Connect (Debezium PostgreSQL connector)
- Kafka REST Proxy (port 8082)
- Conduktor Console (http://localhost:8080)
- PostgreSQL (base de données de démo)

## Démo cloud avec Redpanda + Conduktor

Si tu utilises Redpanda Cloud pour Kafka, tu peux quand même utiliser Conduktor Console localement :

```bash
# 1. Configure les credentials Redpanda
cp .env.conduktor.example .env.conduktor
# Édite .env.conduktor avec tes credentials

# 2. Démarre Conduktor connecté à Redpanda Cloud
../../scripts/start-conduktor-cloud.sh

# 3. Accède à http://localhost:8080
```

**Optionnel** : Expose Conduktor aux spectateurs pendant le talk :
```bash
ngrok http 8080
```

## Fichiers

- `full-stack.yml` - Stack complète locale
- `conduktor-cloud.yml` - Conduktor connecté à Redpanda Cloud
- `conduktor.yml` - Config de base Conduktor
- `.env.conduktor.example` - Template credentials Redpanda

