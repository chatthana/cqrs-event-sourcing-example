import { config } from 'dotenv';
config();

import { otelStart } from '../infrastructure/opentelemetry/otel';
otelStart('esdb-snapshot-subscriber', '1.0.0');

import { default as logger } from '../infrastructure/logger';
import configuration from '../configuration';
import { EventStoreDBClient } from '@eventstore/db-client';
import { PersistentSubscriber } from '../infrastructure/storage/esdb/subscription';
import { InventoryItemSnapshotSubscription } from '../infrastructure/subscriptions/inventory_item';
import { EventStoreDbInventoryItemRepository } from '../infrastructure/repositories/esdb_inventory_item_repository';

(async () => {
  const esdb: EventStoreDBClient = EventStoreDBClient.connectionString(configuration.esdb.uri);
  const inventoryItemRepository = new EventStoreDbInventoryItemRepository(esdb);

  const inventoryItemSnapshotSubscriber: PersistentSubscriber = new InventoryItemSnapshotSubscription(
    esdb,
    inventoryItemRepository
  );

  const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    try {
      await esdb.dispose();
      logger.info('EventStoreDB is disposed');
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

  await inventoryItemSnapshotSubscriber.start();
})();
