import { config } from 'dotenv';
config();

import { otelStart } from '../infrastructure/opentelemetry/otel';
otelStart('esdb-event-bus', '1.0.0');

import { default as logger } from '../infrastructure/logger';
import configuration from '../configuration';
import { Kafka, Producer, Partitioners, Consumer } from 'kafkajs';
import { EventBus } from '../core/event';
import { KafkaEventbus } from '../infrastructure/bus/eventbus';
import { InventoryItemCreatedEventHandler } from '../services/event_handlers/inventory_item_event_handlers';

(async () => {
  const kafka: Kafka = new Kafka({ brokers: configuration.kafka.brokerList.split(',') });
  const inventoryItemKafkaConsumerGroup: Consumer = kafka.consumer({ groupId: 'inventory_item_group' });
  const producer: Producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
  await producer.connect();

  const kafkaEventBus: EventBus = new KafkaEventbus(inventoryItemKafkaConsumerGroup, producer);

  const inventoryItemCreatedEventHandler = new InventoryItemCreatedEventHandler();

  kafkaEventBus.register(inventoryItemCreatedEventHandler);

  const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    try {
      await inventoryItemKafkaConsumerGroup.disconnect();
      logger.info('Kafka consumer [inventory_item_group] disconnected');
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
    }
  };

  process.on('SIGTERM', async () => {
    await gracefulShutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await gracefulShutdown();
    process.exit(0);
  });

  await kafkaEventBus.subscribe();
})();
