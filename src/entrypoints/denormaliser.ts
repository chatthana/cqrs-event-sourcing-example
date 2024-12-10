import { config } from 'dotenv';
config();

import { otelStart } from '../infrastructure/opentelemetry/otel';
otelStart('esdb-denormaliser', '1.0.0');

import { Consumer, Kafka } from 'kafkajs';
import { default as logger } from '../infrastructure/logger';
import configuration from '../configuration';
import { InventoryItemDenormaliser } from '../infrastructure/denormalisers/inventory_item';
import { InventoryItemReadModel } from '../infrastructure/storage/mongodb/models/inventory_item';
import { connect } from 'mongoose';

(async () => {
  await connect(configuration.mongodb.uri);

  const kafka: Kafka = new Kafka({ brokers: configuration.kafka.brokerList.split(',') });
  const inventoryItemDenormaliserKafkaConsumerGroup: Consumer = kafka.consumer({
    groupId: 'inventory_item_denormaliser',
  });

  // Denormalisers
  const inventoryItemDenormaliser = new InventoryItemDenormaliser(
    inventoryItemDenormaliserKafkaConsumerGroup,
    InventoryItemReadModel
  );

  const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    try {
      await inventoryItemDenormaliserKafkaConsumerGroup.disconnect();
      logger.info('Kafka consumer [inventory_item_denormaliser] disconnected');
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

  await inventoryItemDenormaliser.run();
})();
