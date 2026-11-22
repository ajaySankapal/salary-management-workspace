import express from 'express';
import cors from 'cors';
import { employeesRouter } from './employees/employees.routes';
import { reportsRouter } from './reports/reports.routes';
import { authRouter } from './auth/auth.routes';
import { requireAuth } from './auth/auth.middleware';
import { sessionMiddleware } from './auth/session';
import { errorHandler, HttpError } from './errors';

// Builds the Express app without binding a port, so tests can call it directly.
export function createApp() {
  const app = express();

  // credentials: true lets the browser send the session cookie; origin: true
  // reflects the caller's origin (a specific origin is required with credentials).
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(sessionMiddleware());

  // Public: health check and sign-in/out.
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'salary-workspace-api',
      time: new Date().toISOString(),
    });
  });
  app.use('/api/auth', authRouter);

  // Everything below requires a signed-in HR user.
  app.use('/api/employees', requireAuth, employeesRouter);
  app.use('/api/reports', requireAuth, reportsRouter);

  // Unknown routes and errors both end up here, as JSON.
  app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));
  app.use(errorHandler);

  return app;
}
