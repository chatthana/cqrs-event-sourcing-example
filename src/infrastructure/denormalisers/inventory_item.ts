import { Consumer, EachMessagePayload } from 'kafkajs';
import { Denormaliser } from '../../core/projection';
import { Model } from 'mongoose';
import { InventoryItemModel } from '../storage/mongodb/models/inventory_item';
import {
  InventoryItemCreated,
  InventoryItemDeactivated,
  InventoryItemEvent,
  StockAdded,
  StockDecreased,
} from '../../domain/events';
import { EventDescriptor } from '../utilities/event-descriptor';

export class InventoryItemDenormaliser implements Denormaliser {
  constructor(
    private readonly _kafkaConsumer: Consumer,
    private readonly _model: Model<InventoryItemModel>
  ) {}

  /**
   * Directly subscribe to Kafka without using EventBus for brevity
   * Moreover, this component does not use type-safe projection which could be improved
   * TODO: Deserialise the event
   */
  public async run(): Promise<void> {
    await this.subscribeToTopics();
    await this._kafkaConsumer.run({
      eachMessage: async ({ message, heartbeat }: EachMessagePayload) => {
        if (message.value) {
          const { payload, revision, type }: EventDescriptor<InventoryItemEvent> = JSON.parse(message.value.toString());
          switch (type) {
            case 'inventory_item_created':
              await this.onInventoryItemCreated(payload as InventoryItemCreated, revision);
              break;
            case 'stock_added':
              await this.onStockAdded(payload as StockAdded, revision);
              break;
            case 'stock_decreased':
              await this.onStockDecreased(payload as StockDecreased, revision);
              break;
            case 'inventory_item_deactivated':
              await this.onInventoryItemDeactivated(payload as InventoryItemDeactivated, revision);
              break;
            default:
              break;
          }
        }

        await heartbeat();
      },
    });
  }

  private async onInventoryItemCreated(event: InventoryItemCreated, version: number): Promise<void> {
    const { id, skuId } = event;

    await this._model.create({
      id,
      version,
      sku: skuId,
      quantity: 0,
      status: 'active',
    });
  }

  private async onStockAdded(event: StockAdded, version: number): Promise<void> {
    await this._model.updateOne({ id: event.id }, { $inc: { quantity: event.quantity }, $set: { version } });
  }

  private async onStockDecreased(event: StockDecreased, version: number): Promise<void> {
    await this._model.updateOne({ id: event.id }, { $inc: { quantity: -event.quantity }, $set: { version } });
  }

  private async onInventoryItemDeactivated(event: InventoryItemDeactivated, version: number): Promise<void> {
    await this._model.updateOne({ id: event.id }, { $set: { status: 'inactive', version } });
  }

  private async subscribeToTopics(): Promise<void> {
    await this._kafkaConsumer.connect();
    await this._kafkaConsumer.subscribe({ topics: ['inventory_item'] });
  }
}
