import { Request, Response, Router } from 'express';
import {
  AddStock,
  CreateInventoryItem,
  DeactivateInventoryItem,
  DecreaseStock,
} from '../../services/commands/inventory_item_commands';
import { StatusCodes } from 'http-status-codes';
import expressAsyncHandler from 'express-async-handler';
import { v7 } from 'uuid';
import { CommandBus } from '../../core/command';
import { InventoryItemQueryService } from '../../services/query/inventory_item';
import { InventoryItemDto } from '../../services/dtos/inventory_item';

export class InventoryItemController {
  public readonly basePath: string = '/inventory_items';
  private _router: Router;

  get router() {
    return this._router;
  }

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryService: InventoryItemQueryService
  ) {
    this._router = Router();
    this._router.post('/', expressAsyncHandler(this.create.bind(this)));
    this._router.put('/:id/add_stock', expressAsyncHandler(this.addStock.bind(this)));
    this._router.put('/:id/decrease_stock', expressAsyncHandler(this.decreaseStock.bind(this)));
    this._router.put('/:id/deactivate', expressAsyncHandler(this.deactivate.bind(this)));
    // Query part
    this._router.get('/:id', expressAsyncHandler(this.getInventoryItemById.bind(this)));
  }

  private async create(req: Request, res: Response) {
    const resultedId = await this._commandBus.send(new CreateInventoryItem(v7(), req.body.skuId));
    res
      .status(StatusCodes.ACCEPTED)
      .json({ code: '000', message: 'create inventory item command accepted', data: { id: resultedId } });
  }

  private async addStock(req: Request, res: Response) {
    await this._commandBus.send(new AddStock(req.params.id, req.body.amount, req.body.revision));
    res
      .status(StatusCodes.ACCEPTED)
      .json({ code: '000', message: `accepted request to add the stock for the item ${req.params.id}` });
  }

  private async decreaseStock(req: Request, res: Response) {
    await this._commandBus.send(new DecreaseStock(req.params.id, req.body.amount, req.body.revision));
    res
      .status(StatusCodes.ACCEPTED)
      .json({ code: '000', message: `accepted request to deduct the stock for the item ${req.params.id}` });
  }

  private async deactivate(req: Request, res: Response) {
    await this._commandBus.send(new DeactivateInventoryItem(req.params.id, req.body.revision));
    res
      .status(StatusCodes.ACCEPTED)
      .json({ code: '000', message: `deactivation request for the item ${req.params.id} accepted` });
  }

  private async getInventoryItemById(req: Request, res: Response) {
    const result: InventoryItemDto = await this._queryService.getById(req.params.id);
    res.status(StatusCodes.OK).json({ code: '000', data: result });
  }
}
