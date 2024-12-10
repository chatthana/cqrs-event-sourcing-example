import { Span } from '@opentelemetry/api';
import { CommandHandler } from '../../core/command';
import { InventoryItem } from '../../domain/inventory_item';
import { InventoryItemRepository } from '../../domain/inventory_item_repository';
import { tracer } from '../../infrastructure/opentelemetry/tracer';
import {
  AddStock,
  CreateInventoryItem,
  DeactivateInventoryItem,
  DecreaseStock,
} from '../commands/inventory_item_commands';
import { meter } from '../../infrastructure/opentelemetry/meter';

export class CreateInventoryItemCommandHandler implements CommandHandler<CreateInventoryItem> {
  $target = 'create_inventory_item';

  constructor(private readonly _repository: InventoryItemRepository) {}

  public async execute(command: CreateInventoryItem) {
    return tracer.startActiveSpan('execute create inventory item command', async (span: Span) => {
      const inventoryItem: InventoryItem = new InventoryItem(command.id, command.skuId);
      span.setAttribute('command.type', this.constructor.name);
      span.setAttribute('layer', 'application');
      await this._repository.save(inventoryItem, -1);
      const counter = meter.createCounter('created_order(s)');
      counter.add(1);
      span.end();

      return inventoryItem.id;
    });
  }
}

export class AddStockCommandHandler implements CommandHandler<AddStock> {
  $target = 'add_stock';

  constructor(private readonly _repository: InventoryItemRepository) {}

  public async execute(command: AddStock) {
    return tracer.startActiveSpan('execute add stock command', async (span: Span) => {
      const inventoryItem: InventoryItem = await this._repository.getById(command.id);
      span.setAttribute('command.type', this.constructor.name);
      span.setAttribute('layer', 'application');
      inventoryItem.addStock(command.amount);
      await this._repository.save(inventoryItem, command.revision);
      span.end();
    });
  }
}

export class DecreaseStockCommandHandler implements CommandHandler<DecreaseStock> {
  $target = 'decrease_stock';

  constructor(private readonly _repository: InventoryItemRepository) {}

  public async execute(command: DecreaseStock) {
    return tracer.startActiveSpan('execute dcrease stock command', async (span: Span) => {
      const inventoryItem: InventoryItem = await this._repository.getById(command.id);
      span.setAttribute('command.type', this.constructor.name);
      span.setAttribute('layer', 'application');
      inventoryItem.decreaseStock(command.amount);
      await this._repository.save(inventoryItem, command.revision);
      span.end();
    });
  }
}

export class DeactivateInventoryItemCommandHandler implements CommandHandler<DeactivateInventoryItem> {
  $target = 'deactivate_inventory_item';

  constructor(private readonly _repository: InventoryItemRepository) {}

  public async execute(command: DeactivateInventoryItem) {
    return tracer.startActiveSpan('execute deactivation command', async (span: Span) => {
      const inventoryItem: InventoryItem = await this._repository.getById(command.id);
      span.setAttribute('command.type', this.constructor.name);
      span.setAttribute('layer', 'application');
      inventoryItem.deactivate();
      await this._repository.save(inventoryItem, command.revision);
      span.end();
    });
  }
}
