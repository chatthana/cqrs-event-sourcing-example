import { Event } from '../../core/event';
import { generateUniqueId } from './id';

export class EventMetaData {
  idempotencyKey: string;
  timestamp: Date;
}

export interface EventDescriptor<T extends Event = Event> {
  type: string;
  payload: T;
  revision: number;
  metadata: EventMetaData;
}

export const createEventDescriptor = <T extends Event>(event: T, revision: number): EventDescriptor => {
  return {
    type: event.$type,
    payload: event,
    revision: Number(revision),
    metadata: {
      timestamp: new Date(),
      idempotencyKey: generateUniqueId(),
    },
  };
};
