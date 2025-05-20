import {
  CreateInventoryItemCommandHandler,
  AddStockCommandHandler,
  DecreaseStockCommandHandler,
  DeactivateInventoryItemCommandHandler,
} from './inventory_item_command_handlers';
import { InventoryItemRepository } from '../../domain/inventory_item_repository';
import {
  CreateInventoryItem,
  AddStock,
  DecreaseStock,
  DeactivateInventoryItem,
} from '../commands/inventory_item_commands';
import { InventoryItem } from '../../domain/inventory_item';

jest.mock('../../domain/inventory_item_repository');
jest.mock('../../infrastructure/opentelemetry/tracer', () => {
  interface Span {
    setAttribute: jest.Mock;
    end: jest.Mock;
  }

  return {
    tracer: {
      startActiveSpan: (
        name: string,
        optionsOrCallback: ((span: Span) => any) | Record<string, unknown>,
        maybeCallback?: (span: Span) => any
      ) => {
        const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;

        if (!callback || typeof callback !== 'function') {
          throw new Error('No callback function provided to startActiveSpan');
        }

        const fakeSpan: Span = {
          setAttribute: jest.fn(),
          end: jest.fn(),
        };
        return callback(fakeSpan);
      },
    },
  };
});

jest.mock('../../infrastructure/opentelemetry/meter', () => ({
  meter: {
    createCounter: () => ({ add: jest.fn() }),
  },
}));

describe('InventoryItemCommandHandlers', () => {
  let repository: jest.Mocked<InventoryItemRepository>;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      getById: jest.fn(),
      saveSnapshot: jest.fn(),
    } as jest.Mocked<InventoryItemRepository>;
  });
  class MockEventStoreDbInventoryItemRepository implements jest.Mocked<InventoryItemRepository> {
    save = jest.fn();
    getById = jest.fn();
    saveSnapshot = jest.fn();
  }

  beforeEach(() => {
    repository = new MockEventStoreDbInventoryItemRepository();
  });
  describe('CreateInventoryItemCommandHandler', () => {
    it('should create an inventory item', async () => {
      const handler = new CreateInventoryItemCommandHandler(repository);
      const command = new CreateInventoryItem('item-id', 'sku-id');
      repository.save.mockResolvedValueOnce(undefined);

      const result = await handler.execute(command);

      expect(repository.save).toHaveBeenCalledWith(expect.any(InventoryItem), -1);
      expect(result).toBe('item-id');
    });
  });

  describe('AddStockCommandHandler', () => {
    it('should add stock to an inventory item', async () => {
      const handler = new AddStockCommandHandler(repository);
      const command = new AddStock('item-id', 10, 1);
      const inventoryItem = new InventoryItem('item-id', 'sku-id');
      jest.spyOn(inventoryItem, 'addStock');
      repository.getById.mockResolvedValueOnce(inventoryItem);
      repository.save.mockResolvedValueOnce(undefined);

      await handler.execute(command);

      expect(repository.getById).toHaveBeenCalledWith('item-id');
      expect(inventoryItem.addStock).toHaveBeenCalledWith(10);
      expect(repository.save).toHaveBeenCalledWith(inventoryItem, 1);
    });
  });

  describe('DecreaseStockCommandHandler', () => {
    it('should decrease stock of an inventory item', async () => {
      const handler = new DecreaseStockCommandHandler(repository);
      const command = new DecreaseStock('item-id', 5, 1);
      const inventoryItem = new InventoryItem('item-id', 'sku-id');
      inventoryItem.addStock(10);
      jest.spyOn(inventoryItem, 'decreaseStock');
      repository.getById.mockResolvedValueOnce(inventoryItem);
      repository.save.mockResolvedValueOnce(undefined);

      await handler.execute(command);

      expect(repository.getById).toHaveBeenCalledWith('item-id');
      expect(inventoryItem.decreaseStock).toHaveBeenCalledWith(5);
      expect(repository.save).toHaveBeenCalledWith(inventoryItem, 1);
    });
  });

  describe('DeactivateInventoryItemCommandHandler', () => {
    it('should deactivate an inventory item', async () => {
      const handler = new DeactivateInventoryItemCommandHandler(repository);
      const command = new DeactivateInventoryItem('item-id', 1);
      const inventoryItem = new InventoryItem('item-id', 'sku-id');
      jest.spyOn(inventoryItem, 'deactivate');
      repository.getById.mockResolvedValueOnce(inventoryItem);
      repository.save.mockResolvedValueOnce(undefined);

      await handler.execute(command);

      expect(repository.getById).toHaveBeenCalledWith('item-id');
      expect(inventoryItem.deactivate).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(inventoryItem, 1);
    });
  });

  describe('DecreaseStockCommandHandler', () => {
    it('should throw an error if there is insufficient stock', async () => {
      const handler = new DecreaseStockCommandHandler(repository);
      const command = new DecreaseStock('item-id', 15, 1);
      const inventoryItem = new InventoryItem('item-id', 'sku-id');
      inventoryItem.addStock(10);
      jest.spyOn(inventoryItem, 'decreaseStock').mockImplementation(() => {
        throw new Error('Insufficient stock');
      });
      repository.getById.mockResolvedValueOnce(inventoryItem);

      await expect(handler.execute(command)).rejects.toThrow('Insufficient stock');

      expect(repository.getById).toHaveBeenCalledWith('item-id');
      expect(inventoryItem.decreaseStock).toHaveBeenCalledWith(15);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
