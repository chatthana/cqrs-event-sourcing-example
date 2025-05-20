import { InventoryItemQueryService } from './inventory_item';
import { InventoryItemModel } from '../../infrastructure/storage/mongodb/models/inventory_item';
import { NotFoundException } from '../../core/errors';
import { InventoryItemDto } from '../dtos/inventory_item';
import { Model } from 'mongoose';

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

describe('InventoryItemQueryService', () => {
  let service: InventoryItemQueryService;
  let model: jest.Mocked<Model<InventoryItemModel>>;

  beforeEach(() => {
    model = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Model<InventoryItemModel>>;
    service = new InventoryItemQueryService(model);
  });

  it('should return an inventory item DTO when found', async () => {
    const mockItem = {
      id: 'test-id',
      sku: 'test-sku',
      status: 'ACTIVE',
      quantity: 10,
      version: 1,
    };

    (model.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockItem),
    });

    const result = await service.getById('test-id');

    expect(result).toEqual(
      new InventoryItemDto(mockItem.id, mockItem.sku, mockItem.status, mockItem.quantity, mockItem.version)
    );
  });

  it('should throw NotFoundException when item is not found', async () => {
    (model.findOne as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.getById('non-existent-id')).rejects.toThrow(NotFoundException);
  });
});
