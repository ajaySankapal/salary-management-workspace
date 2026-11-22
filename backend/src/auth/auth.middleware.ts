import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors';

// Blocks a request unless someone is signed in. Applied to the employee, salary,
// and report APIs.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.user) {
    return next(new HttpError(401, 'Sign in to continue'));
  }
  next();
}
