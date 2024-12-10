import { StatusCodes } from 'http-status-codes';

export const errorCodes = {
  NOT_FOUND: '404',
  CONCURRENCY_EXCEPTION: '409',
  UNKNOWN: '500',
  DOMAIN_EXCEPTION: '501D',
};

export const errorHttpCodeMap: Record<string, number> = {
  [errorCodes.NOT_FOUND]: StatusCodes.NOT_FOUND,
  [errorCodes.CONCURRENCY_EXCEPTION]: StatusCodes.CONFLICT,
  [errorCodes.UNKNOWN]: StatusCodes.INTERNAL_SERVER_ERROR,
  [errorCodes.DOMAIN_EXCEPTION]: StatusCodes.INTERNAL_SERVER_ERROR,
};
