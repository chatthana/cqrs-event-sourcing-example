export interface Event {
  $type: string;
  toJSON(): any;
}

export interface EventHandler<T extends Event = Event> {
  $target: string;
  handle(event: T): void | Promise<void>;
}

export interface EventBus {
  register(eventHandler: EventHandler): void;
  publish(event: Event): void | Promise<void>;
  subscribe(): void | Promise<void>;
}
