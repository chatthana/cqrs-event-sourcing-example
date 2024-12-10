import {
  EventStoreDBClient,
  PersistentSubscriptionDoesNotExistError,
  persistentSubscriptionToAllSettingsFromDefaults,
  RecordedEvent,
  RETRY,
  streamNameFilter,
} from '@eventstore/db-client';
import { default as logger } from '../../logger';

export interface PersistentSubscriber {
  start(): Promise<void>;
}

export interface PersistentSubscriberMetadata {
  eventCount: number;
}

export abstract class EventstoreDBBasePersistentSubscriber implements PersistentSubscriber {
  protected abstract $subscriptionGroupName: string;
  protected abstract $streamPrefix: string;

  constructor(private readonly _esdb: EventStoreDBClient) {}

  public async start(): Promise<void> {
    logger.info(`the subscription group ${this.$subscriptionGroupName} started`);

    await this.ensureSubscriptionExists();
    const subscription = this._esdb.subscribeToPersistentSubscriptionToAll(this.$subscriptionGroupName);

    let eventCount: number = 0;

    for await (const event of subscription) {
      try {
        if (!event.event) {
          throw new Error('no event data detected');
        }
        eventCount++;

        await this.handle(event.event, { eventCount });

        subscription.ack(event);
      } catch (error) {
        if (error instanceof Error) {
          subscription.nack(RETRY, error.message, event);
        } else {
          subscription.nack(RETRY, 'unknown error type', event);
        }
      }
    }
  }

  private async ensureSubscriptionExists() {
    try {
      await this._esdb.getPersistentSubscriptionToAllInfo(this.$subscriptionGroupName);
    } catch (error: unknown) {
      if (error instanceof PersistentSubscriptionDoesNotExistError) {
        await this._esdb.createPersistentSubscriptionToAll(
          this.$subscriptionGroupName,
          persistentSubscriptionToAllSettingsFromDefaults(),
          {
            filter: streamNameFilter({ prefixes: [this.$streamPrefix] }),
          }
        );
        return;
      }

      throw error;
    }
  }

  protected abstract handle(event: RecordedEvent, metadata: PersistentSubscriberMetadata): Promise<void>;
}
