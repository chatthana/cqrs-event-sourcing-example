import { Command } from '../../core/command';

export class CreateInventoryItem implements Command {
  $type = 'create_inventory_item';
  constructor(
    public readonly id: string,
    public readonly skuId: string
  ) {}
}

export class AddStock implements Command {
  $type = 'add_stock';
  constructor(
    public readonly id: string,
    public readonly amount: number,
    public readonly revision: number
  ) {}
}

export class DecreaseStock implements Command {
  $type = 'decrease_stock';
  constructor(
    public readonly id: string,
    public readonly amount: number,
    public readonly revision: number
  ) {}
}

export class DeactivateInventoryItem implements Command {
  $type = 'deactivate_inventory_item';
  constructor(
    public readonly id: string,
    public readonly revision: number
  ) {}
}
