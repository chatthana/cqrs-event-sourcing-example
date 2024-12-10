import { NextFunction, Request, Response } from 'express';
import { errorCodes, errorHttpCodeMap } from './constants';
import { StatusCodes } from 'http-status-codes';

export class ApplicationError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly message: string
  ) {
    super(message);
  }
}

export class NotFoundException extends ApplicationError {
  constructor(public readonly message: string = 'entity not found') {
    super(errorCodes.NOT_FOUND, message);
  }
}

export class DomainException extends ApplicationError {
  constructor(public readonly message: string) {
    super(errorCodes.DOMAIN_EXCEPTION, message);
  }
}

export class ConcurrencyException extends ApplicationError {
  constructor(public readonly message: string = 'optimistic concurrency check failed') {
    super(errorCodes.CONCURRENCY_EXCEPTION, message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApplicationError) {
    const { errorCode } = err;
    res.status(errorHttpCodeMap[errorCode]).json({
      errorCode,
      message: err.message,
    });
    return;
  }

  if (err instanceof Error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errorCode: errorCodes.UNKNOWN,
      message: err.message,
    });
    return;
  }

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    errorCode: errorCodes.UNKNOWN,
    message: 'unknown error type detected',
  });
};
