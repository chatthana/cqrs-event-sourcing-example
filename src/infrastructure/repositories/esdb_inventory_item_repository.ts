import {
  BACKWARDS,
  END,
  EventStoreDBClient,
  FORWARDS,
  jsonEvent,
  NO_STREAM,
  START,
  StreamNotFoundError,
  WrongExpectedVersionError,
} from '@eventstore/db-client';
import { InventoryItem, InventoryItemSnapshot } from '../../domain/inventory_item';
import { Event } from '../../core/event';
import { ConcurrencyException } from '../../core/errors';
import { InventoryItemRepository } from '../../domain/inventory_item_repository';
import { InventoryItemEvent } from '../../domain/events';
import { InventoryItemEventClassMap } from '../type-maps/inventory_items';
import { tracer } from '../opentelemetry/tracer';
import { Span } from '@opentelemetry/api';

export class EventStoreDbInventoryItemRepository implements InventoryItemRepository {
  constructor(private readonly _esdb: EventStoreDBClient) {}

  /**
   * Saves the aggregate to the event store.
   * @param aggregate The aggregate to save.
   * @param expectedVersion The expected version of the aggregate.  If -1, then it will create a new stream.
   * @throws {ConcurrencyException} If the expected version does not match the current version.
   */
  public async save(aggregate: InventoryItem, expectedVersion: number): Promise<void> {
    const streamName: string = `event.inventory-item.${aggregate.id}`;
    const events = aggregate.getUncommittedEvents().map((e: Event) =>
      jsonEvent({
        type: e.$type,
        /**
         * TODO: We can define the JSONEventType wrapper with the same shape in this layer (infrastructure)
         * so we can remove toJSON from domain layer (as it is not a domain concern)
         * However, this would result in repetitive code here
         */
        data: e.toJSON(),
      })
    );

    try {
      await this._esdb.appendToStream(streamName, events, {
        expectedRevision: expectedVersion === -1 ? NO_STREAM : BigInt(expectedVersion),
      });

      aggregate.markChangesAsCommitted();
    } catch (error: unknown) {
      if (error instanceof WrongExpectedVersionError) {
        throw new ConcurrencyException();
      }
      throw error;
    }
  }

  /**
   * Loads the aggregate from the event store.
   * It first attempts to load a snapshot to reduce the number of events that need to be processed.
   * If a snapshot is found, it loads the aggregate from the snapshot and then applies any subsequent events.
   * If no snapshot is found, it loads the aggregate from the event history starting from the beginning.
   * @param id The ID of the aggregate to load.
   * @returns The loaded aggregate.
   */
  public async getById(id: string): Promise<InventoryItem> {
    const snapshot = await this.loadSnapshot(id);

    const inventoryItem = new InventoryItem();

    if (snapshot) {
      tracer.startActiveSpan('assign snapshot', { attributes: { layer: 'infrastructure' } }, (span: Span) => {
        inventoryItem.loadFromSnapshot(snapshot);
        span.end();
      });
    }

    return tracer.startActiveSpan(
      'rehydrate events',
      { attributes: { layer: 'infrastructure' } },
      async (span: Span) => {
        const fromRevision = snapshot ? BigInt(snapshot.revision + 1) : START;

        span.setAttribute('fromRevision', fromRevision.toString());

        const events = this._esdb.readStream(`event.inventory-item.${id}`, {
          fromRevision,
          direction: FORWARDS,
        });

        const eventHistory: Event[] = [];

        for await (const resolvedEvent of events) {
          if (!resolvedEvent.event) {
            throw new Error('original event does not exist');
          }

          const event = this.deserialiseEvent(resolvedEvent.event.type, resolvedEvent.event.data);
          eventHistory.push(event);
        }

        inventoryItem.loadFromHistory(eventHistory);

        span.end();

        return inventoryItem;
      }
    );
  }

  /**
   * Saves a snapshot of the aggregate to the event store.
   * @param id The ID of the aggregate to save a snapshot for.
   * @param snapshot The snapshot to save.
   */
  public async saveSnapshot(id: string, snapshot: InventoryItemSnapshot): Promise<void> {
    const streamName: string = `snapshot.inventory-item.${id}`;
    const snapshotEvent = jsonEvent({
      type: 'snapshot',
      data: { ...snapshot },
    });

    await this._esdb.appendToStream(streamName, snapshotEvent);
  }

  /**
   * Loads a snapshot of the aggregate from the event store.
   * @param id The ID of the aggregate to load a snapshot for.
   * @returns The loaded snapshot, or null if no snapshot was found.
   */
  private async loadSnapshot(id: string): Promise<InventoryItemSnapshot | null> {
    const streamName: string = `snapshot.inventory-item.${id}`;
    const events = this._esdb.readStream(streamName, { direction: BACKWARDS, fromRevision: END, maxCount: 1 });

    try {
      for await (const { event } of events) {
        if (event && event.data) {
          return event.data as unknown as InventoryItemSnapshot;
        }
      }
      return null;
    } catch (error: unknown) {
      if (error instanceof StreamNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  private deserialiseEvent(type: string, data: any): InventoryItemEvent {
    const EventClass = InventoryItemEventClassMap[type];

    if (!EventClass) {
      throw new Error('the mapped event does not exist');
    }

    return new EventClass(...Object.values(data)) as InventoryItemEvent;
  }
}
