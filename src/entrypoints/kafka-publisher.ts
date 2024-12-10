import { config } from 'dotenv';
config();

import { otelStart } from '../infrastructure/opentelemetry/otel';
otelStart('esdb-kafka-publisher', '1.0.0');

import { default as logger } from '../infrastructure/logger';
import configuration from '../configuration';
import { EventStoreDBClient } from '@eventstore/db-client';
import { PersistentSubscriber } from '../infrastructure/storage/esdb/subscription';
import { Consumer, Kafka, Partitioners, Producer } from 'kafkajs';
import { InventoryItemKafkaPublishingSubscription } from '../infrastructure/subscriptions/inventory_item';

(async () => {
  const esdb: EventStoreDBClient = EventStoreDBClient.connectionString(configuration.esdb.uri);

  const kafka: Kafka = new Kafka({ brokers: configuration.kafka.brokerList.split(',') });
  const inventoryItemKafkaConsumerGroup: Consumer = kafka.consumer({ groupId: 'inventory_item_group' });
  const producer: Producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });

  await producer.connect();

  // EventStoreDB subscribers
  const inventoryItemPersistentSubscriber: PersistentSubscriber = new InventoryItemKafkaPublishingSubscription(
    esdb,
    producer
  );

  const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    try {
      await esdb.dispose();
      logger.info('EventStoreDB is disposed');
      await inventoryItemKafkaConsumerGroup.disconnect();
      logger.info('Kafka consumer [inventory_item_group] disconnected');
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
    }
  };

  // Handle termination signals for graceful shutdown
  process.on('SIGTERM', async () => {
    await gracefulShutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await gracefulShutdown();
    process.exit(0);
  });

  await inventoryItemPersistentSubscriber.start();
})();
