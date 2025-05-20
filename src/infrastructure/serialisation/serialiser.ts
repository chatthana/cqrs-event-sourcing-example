import { Event } from '../../core/event';

export class Serialiser {
  public static serialise(event: Event): string {
    return JSON.stringify({ type: event.$type, payload: event.toJSON() });
  }

  public static deserialise<T extends Event>(
    type: string,
    serialisedEvent: any,
    typeMap: Record<string, new (...args: any[]) => T>
  ): any {
    const payload = typeof serialisedEvent === 'string' ? JSON.parse(serialisedEvent) : serialisedEvent;

    const EventClass = typeMap[type];

    if (!EventClass) {
      throw new Error('the mapped event does not exist');
    }

    return new EventClass(...Object.values(payload)) as T;
  }
}
