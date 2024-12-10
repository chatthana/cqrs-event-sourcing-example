import { AggregateRoot, Snapshot } from './aggregate_root';

export interface EventSourcedRepository<T extends AggregateRoot, TSnapshot extends Snapshot> {
  save(aggregate: T, expectedVersion: number): void | Promise<void>;
  getById(id: string): T | Promise<T>;
  saveSnapshot(id: string, snapshot: TSnapshot): void | Promise<void>;
}
