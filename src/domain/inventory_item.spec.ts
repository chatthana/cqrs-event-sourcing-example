import { InventoryItem, InventoryItemStatus, Quantity, SKU } from './inventory_item';
import { DomainException } from '../core/errors';
import { v7 } from 'uuid';

describe('InventoryItem', () => {
  let inventoryItem: InventoryItem;
  const skuId = 'test-sku';

  beforeEach(() => {
    inventoryItem = new InventoryItem(v7(), skuId);
  });

  it('should create a new inventory item', () => {
    expect(inventoryItem.skuId.toString()).toBe(skuId);
    expect(inventoryItem.quantity.getValue()).toBe(0);
    expect(inventoryItem.status).toBe(InventoryItemStatus.ACTIVE);
  });

  it('should add stock to the inventory item', () => {
    inventoryItem.addStock(10);
    expect(inventoryItem.quantity.getValue()).toBe(10);
  });

  it('should decrease stock from the inventory item', () => {
    inventoryItem.addStock(10);
    inventoryItem.decreaseStock(5);
    expect(inventoryItem.quantity.getValue()).toBe(5);
  });

  it('should throw an error when decreasing stock below zero', () => {
    expect(() => inventoryItem.decreaseStock(1)).toThrow(DomainException);
  });

  it('should deactivate the inventory item', () => {
    inventoryItem.deactivate();
    expect(inventoryItem.status).toBe(InventoryItemStatus.INACTIVE);
  });

  it('should load from snapshot', () => {
    const snapshot = {
      id: 'test-id',
      skuId: 'test-sku',
      quantity: 10,
      status: InventoryItemStatus.ACTIVE,
      revision: 1,
    };
    inventoryItem.loadFromSnapshot(snapshot);

    expect(inventoryItem.id).toBe(snapshot.id);
    expect(inventoryItem.skuId.toString()).toBe(snapshot.skuId);
    expect(inventoryItem.quantity.getValue()).toBe(snapshot.quantity);
    expect(inventoryItem.status).toBe(snapshot.status);
  });

  it('should create a valid SKU', () => {
    const sku = new SKU('valid-sku');
    expect(sku.toString()).toBe('valid-sku');
  });

  it('should throw an error for an empty SKU', () => {
    expect(() => new SKU('')).toThrow(DomainException);
  });

  it('should throw an error for a whitespace SKU', () => {
    expect(() => new SKU('   ')).toThrow(DomainException);
  });

  it('should create a valid Quantity', () => {
    const quantity = new Quantity(10);
    expect(quantity.getValue()).toBe(10);
  });

  it('should throw an error for a negative Quantity', () => {
    expect(() => new Quantity(-1)).toThrow(DomainException);
  });

  it('should increase the quantity', () => {
    const quantity = new Quantity(10);
    const newQuantity = quantity.increase(5);
    expect(newQuantity.getValue()).toBe(15);
  });

  it('should throw an error when increasing by a negative amount', () => {
    const quantity = new Quantity(10);
    expect(() => quantity.increase(-5)).toThrow(DomainException);
  });

  it('should decrease the quantity', () => {
    const quantity = new Quantity(10);
    const newQuantity = quantity.decrease(5);
    expect(newQuantity.getValue()).toBe(5);
  });

  it('should throw an error when decreasing by a negative amount', () => {
    const quantity = new Quantity(10);
    expect(() => quantity.decrease(-5)).toThrow(DomainException);
  });

  it('should throw an error when decreasing below zero', () => {
    const quantity = new Quantity(5);
    expect(() => quantity.decrease(10)).toThrow(DomainException);
  });

  it('should check if quantity is zero', () => {
    const quantity = new Quantity(0);
    expect(quantity.isZero()).toBe(true);
  });

  it('should check if quantity is not zero', () => {
    const quantity = new Quantity(5);
    expect(quantity.isZero()).toBe(false);
  });
});
