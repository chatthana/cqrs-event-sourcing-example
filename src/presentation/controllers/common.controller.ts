import { Request, Response, Router } from 'express';
import { CommonService } from '../../services/common.service';
import { ApplicationError } from '../../core/errors';
import { errorCodes } from '../../core/constants';

export class CommonController {
  public readonly basePath: string = '/';
  private _router: Router;

  get router() {
    return this._router;
  }

  constructor(private readonly _service: CommonService) {
    this._router = Router();
    this._router.get('/healthz', this.healthCheck.bind(this));
    this._router.get('/greet/:name', this.greet.bind(this));
    this._router.get('/triggerError/', this.triggerError.bind(this));
  }

  private healthCheck(_: Request, res: Response): void {
    const payload: { message: string; statusCode: string } = { message: 'success', statusCode: '000' };
    res.status(200).json(payload);
  }

  private greet(req: Request, res: Response): void {
    const result: string = this._service.greet(req.params.name);
    res.status(200).json({ statusCode: '000', message: 'successfully greeted the user', data: result });
  }

  private triggerError(): void {
    throw new ApplicationError(errorCodes.NOT_FOUND, 'fucking error');
  }
}
