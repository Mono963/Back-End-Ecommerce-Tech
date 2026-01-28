import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const loggerConfig: WinstonModuleOptions = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf((info) => {
          const { timestamp, level, message, context, ...meta } = info;
          const ctx = typeof context === 'string' ? context : 'App';
          const msg = typeof message === 'string' ? message : String(message);
          const ts = typeof timestamp === 'string' ? timestamp : '';
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${ts} [${ctx}] ${level}: ${msg} ${metaStr}`;
        }),
      ),
    }),
    ...(isProduction
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
};
