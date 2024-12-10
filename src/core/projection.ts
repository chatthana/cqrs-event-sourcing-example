export interface Denormaliser {
  run(): void | Promise<void>;
}
