import { createLogger, format, Logger, transports } from 'winston';

const loggerInstance: Logger = createLogger({
  format: format.combine(format.json(), format.colorize()),
  transports: [new transports.Console()],
});

export default loggerInstance;
