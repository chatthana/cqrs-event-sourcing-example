import { Command, CommandBus, CommandHandler } from '../../core/command';
import { tracer } from '../opentelemetry/tracer';
import { default as logger } from '../logger';

export class InMemCommandBus<BaseCommand extends Command = Command> implements CommandBus<BaseCommand> {
  private _handlers: Map<string, CommandHandler> = new Map();

  public register(handler: CommandHandler): void {
    if (this._handlers.has(handler.$target)) {
      return;
    }
    this._handlers.set(handler.$target, handler);
  }

  public async send<T extends BaseCommand>(command: T) {
    const span = tracer.startSpan('route command to handler');
    span.setAttribute('layer', 'infrastructure');

    const handler = this._handlers.get(command.$type);

    span.setAttribute('command.type', command.$type);

    if (!handler) {
      throw new Error('the requested command handler does not exist');
    }

    logger.info(`routing the command ${command.$type} to the handler ${handler.constructor.name}`);

    span.setAttribute('command.handler', handler.constructor.name);

    span.end();
    return handler.execute(command);
  }
}
