import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
};
