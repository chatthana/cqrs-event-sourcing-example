import {
  InventoryItemEvent,
  InventoryItemCreated,
  StockAdded,
  StockDecreased,
  InventoryItemDeactivated,
} from '../../domain/events';

export const InventoryItemEventClassMap: Record<string, new (...args: any[]) => InventoryItemEvent> = {
  inventory_item_created: InventoryItemCreated,
  stock_added: StockAdded,
  stock_decreased: StockDecreased,
  inventory_item_deactivated: InventoryItemDeactivated,
};
