import { config } from 'dotenv';
config();
import configuration from '../configuration';

import { otelStart } from '../infrastructure/opentelemetry/otel';
otelStart('esdb-service', '1.0.0');

import { Server } from '../infrastructure/server';
import { CommonController } from '../presentation/controllers/common.controller';
import { Controller } from '../infrastructure/server/router.interface';
import { CommonService } from '../services/common.service';
import {
  AddStockCommandHandler,
  CreateInventoryItemCommandHandler,
  DeactivateInventoryItemCommandHandler,
  DecreaseStockCommandHandler,
} from '../services/command_handlers/inventory_item_command_handlers';
import { CommandBus, CommandHandler } from '../core/command';
import { InMemCommandBus } from '../infrastructure/bus/commandbus';
import { EventStoreDBClient } from '@eventstore/db-client';
import { EventStoreDbInventoryItemRepository } from '../infrastructure/repositories/esdb_inventory_item_repository';
import { InventoryItemController } from '../presentation/controllers/inventory_item.controller';

import { Kafka, Partitioners, Producer } from 'kafkajs';
import { default as logger } from '../infrastructure/logger';
import { InventoryItemReadModel } from '../infrastructure/storage/mongodb/models/inventory_item';
import { InventoryItemQueryService } from '../services/query/inventory_item';
import { connect } from 'mongoose';

(async () => {
  /**
   * An application entry point
   */

  // Mongodb
  await connect(configuration.mongodb.uri);

  // Data storage clients
  const esdb: EventStoreDBClient = EventStoreDBClient.connectionString(configuration.esdb.uri);

  // Message Brokers
  const kafka: Kafka = new Kafka({ brokers: configuration.kafka.brokerList.split(',') });
  const producer: Producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
  await producer.connect();

  // Storage & Repositories
  const inventoryItemRepository = new EventStoreDbInventoryItemRepository(esdb);

  // The server component
  const server: Server = new Server();

  // The services
  const commonService: CommonService = new CommonService();

  // Command Handlers
  const createInventoryCommandHandler: CommandHandler = new CreateInventoryItemCommandHandler(inventoryItemRepository);
  const addStockCommandHandler: CommandHandler = new AddStockCommandHandler(inventoryItemRepository);
  const decreaseStockCommandHandler: CommandHandler = new DecreaseStockCommandHandler(inventoryItemRepository);
  const deactivateInventoryItemCommandHandler: CommandHandler = new DeactivateInventoryItemCommandHandler(
    inventoryItemRepository
  );

  // Command Handler Registration
  const commandBus: CommandBus = new InMemCommandBus();
  commandBus.register(createInventoryCommandHandler);
  commandBus.register(addStockCommandHandler);
  commandBus.register(decreaseStockCommandHandler);
  commandBus.register(deactivateInventoryItemCommandHandler);

  // Query services
  const inventoryItemQueryService = new InventoryItemQueryService(InventoryItemReadModel);

  // Controller Registrations
  const commonController: Controller = new CommonController(commonService);
  const inventoryItemController: Controller = new InventoryItemController(commandBus, inventoryItemQueryService);

  server.registerController(commonController);
  server.registerController(inventoryItemController);

  const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    try {
      await producer.disconnect();
      logger.info('Kafka producer disconnected');
      await esdb.dispose();
      logger.info('EventStoreDB is disposed');
      await server.stop();
      logger.info('The server stopped');
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

  try {
    server.run(parseInt(configuration.server.port, 10));
  } catch (error: unknown) {
    logger.error('failed to start the server', error);
    await gracefulShutdown();
  }
})();
