import { AggregateRoot, Snapshot } from '../core/aggregate_root';
import { Event } from '../core/event';
import { DomainException } from '../core/errors';
import { InventoryItemCreated, InventoryItemDeactivated, StockAdded, StockDecreased } from './events';
import { v7 } from 'uuid';
import { tracer } from '../infrastructure/opentelemetry/tracer';
import { Span } from '@opentelemetry/api';

export enum InventoryItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface InventoryItemSnapshot extends Snapshot {
  skuId: string;
  quantity: number;
  status: InventoryItemStatus;
}

export class SKU {
  constructor(private readonly value: string) {
    if (!value || value.trim() === '') {
      throw new DomainException('sku cannot be empty');
    }
  }

  toString() {
    return this.value;
  }
}

export class Quantity {
  private readonly value: number;

  constructor(value: number) {
    if (value < 0) {
      throw new DomainException('quantity cannot be negative');
    }
    this.value = value;
  }

  public increase(amount: number): Quantity {
    if (amount < 0) throw new DomainException('the amount cannot be negative');
    return new Quantity(this.value + amount);
  }

  public decrease(amount: number): Quantity {
    if (amount < 0) throw new DomainException('Decrease amount cannot be negative');
    if (this.value < amount) throw new DomainException('not enough quantity to decrease');
    return new Quantity(this.value - amount);
  }

  public isZero(): boolean {
    return this.value === 0;
  }

  public getValue(): number {
    return this.value;
  }
}

export class InventoryItem extends AggregateRoot {
  private _skuId: SKU;
  private _quantity: Quantity = new Quantity(0);
  private _status: InventoryItemStatus = InventoryItemStatus.ACTIVE;

  get skuId(): SKU {
    return this._skuId;
  }

  get quantity(): Quantity {
    return this._quantity;
  }

  get status(): InventoryItemStatus {
    return this._status;
  }

  constructor();
  constructor(id: string, skuId: string);
  constructor(id?: string, skuId?: string) {
    super(id || v7());

    if (skuId) {
      tracer.startActiveSpan(
        'create a new inventory item',
        { attributes: { 'aggregate.name': this.constructor.name, layer: 'domain' } },
        (span: Span) => {
          this.apply(new InventoryItemCreated(this.id, skuId));
          span.end();
        }
      );
    }
  }

  public addStock(amount: number): void {
    return tracer.startActiveSpan(
      'add stock',
      { attributes: { 'aggregate.name': this.constructor.name, layer: 'domain' } },
      (span: Span) => {
        this.apply(new StockAdded(this.id, amount));
        span.end();
      }
    );
  }

  public decreaseStock(amount: number): void {
    return tracer.startActiveSpan(
      'decrease stock',
      { attributes: { 'aggregate.name': this.constructor.name, layer: 'domain' } },
      (span: Span) => {
        this.apply(new StockDecreased(this.id, amount));
        span.end();
      }
    );
  }

  public deactivate(): void {
    return tracer.startActiveSpan(
      'deactivate item',
      { attributes: { 'aggregate.name': this.constructor.name, layer: 'domain' } },
      (span: Span) => {
        this.apply(new InventoryItemDeactivated(this.id));
        span.end();
      }
    );
  }

  protected when(e: Event): void {
    switch (e.$type) {
      case 'inventory_item_created': {
        const inventoryItemCreatedEvent = e as InventoryItemCreated;
        this.id = inventoryItemCreatedEvent.id;
        this._skuId = new SKU(inventoryItemCreatedEvent.skuId);
        break;
      }
      case 'stock_added': {
        const stockAddedEvent = e as StockAdded;
        this._quantity = this._quantity.increase(stockAddedEvent.quantity);
        break;
      }
      case 'stock_decreased': {
        const stockDecreasedEvent = e as StockDecreased;
        this._quantity = this._quantity.decrease(stockDecreasedEvent.quantity);
        break;
      }
      case 'inventory_item_deactivated': {
        this._status = InventoryItemStatus.INACTIVE;
        break;
      }
      default: {
        throw new Error('no event matched!');
      }
    }
  }

  public loadFromSnapshot(snapshot: InventoryItemSnapshot): void {
    this.id = snapshot.id;
    this._skuId = new SKU(snapshot.skuId);
    this._quantity = new Quantity(snapshot.quantity);
    this._status = snapshot.status;
    this.setVersion(snapshot.revision);
  }
}
