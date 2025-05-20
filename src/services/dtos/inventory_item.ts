export class InventoryItemDto {
  constructor(
    public readonly id: string,
    public readonly sku: string,
    public readonly status: string,
    public readonly quantity: number,
    public readonly currentRevision: number
  ) {}
}
