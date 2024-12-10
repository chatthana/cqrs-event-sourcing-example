import { Consumer, EachMessagePayload, Producer } from 'kafkajs';
import { Event, EventBus, EventHandler } from '../../core/event';
import { default as logger } from '../logger';

export class KafkaEventbus implements EventBus {
  private _handlers: Map<string, EventHandler> = new Map();

  constructor(
    private readonly _kafkaConsumer: Consumer,
    private _kafkaProducer: Producer
  ) {}

  public register(eventHandler: EventHandler): void {
    if (this._handlers.has(eventHandler.$target)) {
      return;
    }
    this._handlers.set(eventHandler.$target, eventHandler);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async publish(_: Event): Promise<void> {
    throw new Error('not implemented');
  }

  public async subscribe(): Promise<void> {
    await this.subscribeTopics();
    await this._kafkaConsumer.run({
      eachMessage: async ({ message, heartbeat }: EachMessagePayload) => {
        if (message.value) {
          logger.info(JSON.parse(message.value.toString()));
        }

        await heartbeat();
      },
    });
  }

  private async subscribeTopics(): Promise<void> {
    await this._kafkaConsumer.connect();
    await this._kafkaConsumer.subscribe({ topics: ['inventory_item'] });
  }
}
