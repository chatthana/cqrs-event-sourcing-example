import { Model } from 'mongoose';
import { InventoryItemModel } from '../../infrastructure/storage/mongodb/models/inventory_item';
import { NotFoundException } from '../../core/errors';
import { InventoryItemDto } from '../dtos/inventory_item';
import { tracer } from '../../infrastructure/opentelemetry/tracer';
import { Span } from '@opentelemetry/api';

export class InventoryItemQueryService {
  constructor(private readonly _model: Model<InventoryItemModel>) {}

  public async getById(id: string): Promise<InventoryItemDto> {
    const result = await this._model.findOne({ id }).exec();
    if (!result) {
      throw new NotFoundException();
    }
    return tracer.startActiveSpan('construct dto', (span: Span) => {
      span.end();
      return new InventoryItemDto(result.id, result.sku, result.status, result.quantity, result.version);
    });
  }
}
