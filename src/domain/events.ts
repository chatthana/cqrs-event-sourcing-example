import { Event } from '../core/event';

export class InventoryItemCreated implements Event {
  $type = 'inventory_item_created';
  constructor(
    public readonly id: string,
    public readonly skuId: string
  ) {}

  public toJSON() {
    return { id: this.id, skuId: this.skuId };
  }
}

export class StockAdded implements Event {
  $type = 'stock_added';
  constructor(
    public readonly id: string,
    public readonly quantity: number
  ) {}

  toJSON() {
    return { id: this.id, quantity: this.quantity };
  }
}

export class StockDecreased implements Event {
  $type = 'stock_decreased';
  constructor(
    public readonly id: string,
    public readonly quantity: number
  ) {}

  toJSON() {
    return { id: this.id, quantity: this.quantity };
  }
}

export class InventoryItemDeactivated implements Event {
  $type = 'inventory_item_deactivated';
  constructor(public readonly id: string) {}

  toJSON() {
    return { id: this.id };
  }
}

export type InventoryItemEvent = InventoryItemCreated | StockAdded | StockDecreased | InventoryItemDeactivated;
