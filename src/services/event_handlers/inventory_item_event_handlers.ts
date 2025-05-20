import { Span } from '@opentelemetry/api';
import { EventHandler } from '../../core/event';
import { InventoryItemCreated } from '../../domain/events';
import { default as logger } from '../../infrastructure/logger';
import { tracer } from '../../infrastructure/opentelemetry/tracer';

export class InventoryItemCreatedEventHandler implements EventHandler<InventoryItemCreated> {
  $target: string = 'inventory_item_created';

  public async handle(event: InventoryItemCreated): Promise<void> {
    tracer.startActiveSpan('created item handler', (span: Span) => {
      logger.info(event);
      span.end();
    });
  }
}
