import type { ErrorRequestHandler, RequestHandler } from 'express';

// Throw this from a route to return a specific status; anything else is a 500.
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Wraps an async route so a rejected promise reaches the error handler.
// (Express 4 doesn't forward async errors on its own.)
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// The single place that turns errors into JSON responses.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError ? err.message : 'Internal server error';
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
};
