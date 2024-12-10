import express, { Application, json, urlencoded } from 'express';
import { Controller } from './router.interface';
import { errorHandler } from '../../core/errors';
import { default as logger } from '../logger';
import { Server as HttpServer } from 'http';

export class Server {
  private _app: Application;
  private _server: HttpServer;

  constructor() {
    this._app = express();
    this.configure();
  }

  private configure(): void {
    this._app.use(urlencoded({ extended: true }));
    this._app.use(json());
  }

  public registerController(controller: Controller) {
    this._app.use(controller.basePath, controller.router);
  }

  public run(port: number): void {
    this._app.use(errorHandler);
    this._server = this._app.listen(port, () => {
      logger.info(`the application is listening on the port ${port}`);
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._server) {
        this._server.close((error) => {
          if (error) {
            logger.error('Error while stopping the server:', error);
            return reject(error);
          }
          logger.info('Server stopped successfully');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
