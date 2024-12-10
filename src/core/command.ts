export interface Command {
  $type: string;
}

export interface CommandHandler<T extends Command = Command> {
  $target: string;
  execute(command: T): any;
}

export interface CommandBus<BaseCommand extends Command = Command> {
  register(handler: CommandHandler): void;
  send<T extends BaseCommand>(command: T): any;
}
