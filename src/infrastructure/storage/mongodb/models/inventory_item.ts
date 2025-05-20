import { model, Schema } from 'mongoose';

export interface InventoryItemModel {
  id: string;
  sku: string;
  quantity: number;
  status: string;
  version: number;
}

const inventoryItemSchema = new Schema<InventoryItemModel>({
  id: { type: String, required: true, unique: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  status: { type: String, required: true },
  version: { type: Number, required: true },
});

export const InventoryItemReadModel = model<InventoryItemModel>(
  'InventoryItemReadModel',
  inventoryItemSchema,
  'inventory_items'
);
