import { Request as _ExpressRequest } from 'express';

declare module 'express' {
  export interface Request {
    now?: string;
  }
}
