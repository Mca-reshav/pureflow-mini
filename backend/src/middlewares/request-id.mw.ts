import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) ?? createId();
    req['requestId'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
