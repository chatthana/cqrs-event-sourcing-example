# Event Sourcing with EventStoreDB

This is an example project demonstrating the implementation of event-sourced inventory application with EventStoreDB as an event store

### DISCLAIMER!

> I can not guarantee universally accepted practises and whatever demonstrated in this project is solely based on my taste. If you find this project useful, take a moment and discuss with your team whether this is applicable for them!

## Architecture Overview

The application leverages Event Sourcing with EventStoreDB as the central event store. Events are published to Kafka for asynchronous processing and consumption by other services. A denormalised view of the data is maintained in MongoDB for efficient querying. Distributed tracing is provided by Jaeger, and Redis is available for caching.

## Services

The project comprises the following services:

**Core Application Services (defined in `docker-compose-app.yml`):**

- **webapi:** The main application API, interacting with EventStoreDB and Kafka. Exposes port 3000 (Configurable).
- **snapshot-subscriber:** Creates and maintains snapshots from EventStoreDB events for optimised read model generation.
- **esdb-kafka-publisher:** Publishes events from EventStoreDB to Kafka.
- **denormaliser:** Consumes events from Kafka and updates the MongoDB database.
- **eventbus:** A generic event bus service based on Kafka.

**Supporting Infrastructure Services (defined in `docker-compose.yml`):**

- **EventStoreDB:** The core event store. Configured for single-node operation with standard projections enabled. Uses insecure HTTP for development/testing simplicity. Exposes port 2113. Persistent data and logs are stored in named volumes. Uses an Arm64 compatible image.
- **Kafka:** Asynchronous messaging backbone for inter-service communication. ZooKeeper is used for coordination. Exposes ports 9092 and 29092.
- **ZooKeeper:** Coordination service for Kafka. Exposes port 2181.
- **MongoDB:** Stores the denormalised data for efficient querying. Exposes port 27017. Persistent data is stored in a named volume.
- **Redis:** Available for caching. Exposes port 6379.
- **Jaeger:** Provides distributed tracing for monitoring and troubleshooting. Exposes ports 4317, 4318, and 16686.

## Running the Project

1. **Prerequisites:** Ensure you have Docker and Docker Compose installed.
2. **Start the services:** Navigate to the project directory and run `docker-compose up -d`. The `-d` flag runs the containers in detached mode.

## Configuration and Key Considerations

- **Development Focus:** The configuration prioritises ease of setup for a development/testing environment. **Important:** Security settings are relaxed and not suitable for production.
- **Insecure EventStoreDB and Kafka:** Both EventStoreDB (`EVENTSTORE_INSECURE=true`) and Kafka (`PLAINTEXT` security protocol) are configured insecurely. These settings **must** be changed for production deployments.
- **Arm64 Support:** EventStoreDB uses an image specifically built for Arm64 architecture. The other images are assumed to be multi-architecture.
- **Networking:** All services operate on the same Docker network named `esdb-ts`.
- **Data Persistence:** EventStoreDB and MongoDB use named volumes to persist data across container restarts.

## Shutting down

To stop the services and remove the containers, run `docker-compose down`. Note that data in the named volumes will be preserved.
