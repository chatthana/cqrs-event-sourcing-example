import { v7 } from 'uuid';

export function generateUniqueId(): string {
  return v7();
}
