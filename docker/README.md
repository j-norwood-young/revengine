# RevEngine Docker Setup

There are various Docker containers, split into logical Docker Compose packages.

- `docker-compose.yml` - The main Docker Compose file for the RevEngine application. It relies on the `redis` and `kafka` services to be running.
- `redis/docker-compose.yml` - A Docker Compose file for the Redis service.
- `kafka/docker-compose.yml` - A Docker Compose file for the Kafka service.
- `pipeline/docker-compose.yml` - A Docker Compose file for the pipeline service. This is split out since there should only be one instance of the pipeline service running.
- `ws-subscribe-broadcast/docker-compose.yml` - A Docker Compose file for the WebSocket subscribe-broadcast service (used primarily by FrontpageEngine).

## Networks

The following networks need to be created:
```bash
docker network create --attachable redis-external
docker network create --attachable kafka-external
```

## Running the services

To run the services, you can use the following commands:

```bash
# The core services:
docker compose -f docker/redis/docker-compose.yml up -d
docker compose -f docker/kafka/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml up -d
# Optional services:
docker compose -f docker/pipeline/docker-compose.yml up -d # Only one instance of this should be running
docker compose -f docker/ws-subscribe-broadcast/docker-compose.yml up -d # Only for FrontpageEngine
```
## Updating a specific service

To update a specific service, you can use the following commands:

```bash
docker compose -f docker/docker-compose.yml up -d --no-deps --build <service-name>
```

## Services in RevEngine

The following services are part of RevEngine:
- `api` - The main API service for RevEngine.
- `frontend` - The main frontend service for RevEngine.
- `tracker` - Tracks hits
- `consolidator` - Consolidates hits and sends to ElasticSearch
- `crossword_tracker` - Tracks crossword hits
- `listeners` - Public and private endpoints for RevEngine