import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/error.js';

export const validate = (schema: ZodSchema, source: 'body' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(result.error.issues[0].message, 400));
    }
    if (source === 'body') req.body = result.data
    else Object.assign(req.query, result.data);
    next();
  };
};