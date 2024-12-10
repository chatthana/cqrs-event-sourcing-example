import { v7 } from 'uuid';
import { Event } from './event';

export interface Snapshot {
  id: string;
  revision: number;
}

export abstract class AggregateRoot {
  public id: string;
  private _changes: Event[] = [];
  private _version: number = 0;

  get version(): number {
    return this._version;
  }

  constructor(id?: string) {
    this.id = id || v7();
  }

  protected setVersion(version: number) {
    this._version = version;
  }

  public getUncommittedEvents(): Event[] {
    return this._changes;
  }

  public markChangesAsCommitted(): void {
    this._changes.length = 0;
  }

  protected apply(e: Event): void {
    this.applyEvent(e, true);
  }

  private applyEvent(e: Event, isNew: boolean = false) {
    this.when(e);

    if (isNew) {
      this._changes = [...this._changes, e];
    }
  }

  public loadFromHistory(events: Event[]) {
    for (const event of events) {
      this.applyEvent(event);
      this._version++;
    }
  }

  protected abstract when(e: Event): void;

  protected abstract loadFromSnapshot(snapshot: Snapshot): void;
}
