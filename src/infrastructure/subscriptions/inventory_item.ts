import { EventStoreDBClient, RecordedEvent } from '@eventstore/db-client';
import { EventstoreDBBasePersistentSubscriber } from '../storage/esdb/subscription';
import { Producer } from 'kafkajs';
import { InventoryItem } from '../../domain/inventory_item';
import { InventoryItemRepository } from '../../domain/inventory_item_repository';
import { context, propagation, Span, SpanContext, trace } from '@opentelemetry/api';
import { tracer } from '../opentelemetry/tracer';
import { InventoryItemEventClassMap } from '../type-maps/inventory_items';
import { InventoryItemEvent } from '../../domain/events';
import { Serialiser } from '../serialisation/serialiser';
import { createEventDescriptor } from '../utilities/event-descriptor';

export class InventoryItemKafkaPublishingSubscription extends EventstoreDBBasePersistentSubscriber {
  protected $subscriptionGroupName = 'inventory_item_subscription_group';
  protected $streamPrefix = 'event.inventory-item.';

  constructor(
    esdb: EventStoreDBClient,
    private readonly _kafkaProducer: Producer
  ) {
    super(esdb);
  }

  protected async handle({ data, revision, type, metadata }: RecordedEvent): Promise<void> {
    const { $traceId: traceId, $spanId: spanId } = metadata as any;

    const spanContext: SpanContext = {
      traceFlags: 1,
      traceId,
      spanId,
    };

    const parentContext = trace.setSpanContext(context.active(), spanContext);

    return context.with(parentContext, async () => {
      return tracer.startActiveSpan('publish to kafka', async (span: Span) => {
        const headers = {};
        propagation.inject(context.active(), headers);

        const event: InventoryItemEvent = Serialiser.deserialise<InventoryItemEvent>(
          type,
          data,
          InventoryItemEventClassMap
        );

        const eventDescriptor = createEventDescriptor<InventoryItemEvent>(event, Number(revision));
        const payload = JSON.stringify(eventDescriptor);

        await this._kafkaProducer.send({
          topic: 'inventory_item',
          messages: [{ key: event.id, value: payload, headers }],
        });

        span.end();
      });
    });
  }
}

export class InventoryItemSnapshotSubscription extends EventstoreDBBasePersistentSubscriber {
  protected $subscriptionGroupName = 'inventory_item_snapshot_subscription';
  protected $streamPrefix = 'event.inventory-item.';

  constructor(
    private readonly esdb: EventStoreDBClient,
    private readonly _repository: InventoryItemRepository
  ) {
    super(esdb);
  }

  protected async handle(event: RecordedEvent): Promise<void> {
    if (Number(event.revision) % 10 === 0 && Number(event.revision) > 0) {
      const aggregateId: string = event.streamId.split('.')[2]; // pattern = event.inventory-item.{id}

      const inventoryItem: InventoryItem = await this._repository.getById(aggregateId);

      await this._repository.saveSnapshot(aggregateId, {
        id: aggregateId,
        revision: Number(event.revision),
        quantity: inventoryItem.quantity.getValue(),
        skuId: inventoryItem.skuId.toString(),
        status: inventoryItem.status,
      });
    }
  }
}
