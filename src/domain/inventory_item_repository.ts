import { EventSourcedRepository } from '../core/event_sourced_repository';
import { InventoryItem, InventoryItemSnapshot } from './inventory_item';

export type InventoryItemRepository = EventSourcedRepository<InventoryItem, InventoryItemSnapshot>;
