import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  const error: Error & { status?: number } = new Error('Not Found');
  error.status = 404;
  next(error);
};
