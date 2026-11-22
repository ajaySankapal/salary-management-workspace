import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { employeesRouter } from './employees/employees.routes';
import { reportsRouter } from './reports/reports.routes';
import { authRouter } from './auth/auth.routes';
import { requireAuth } from './auth/auth.middleware';
import { sessionMiddleware } from './auth/session';
import { errorHandler, HttpError } from './errors';

const isProduction = process.env.NODE_ENV === 'production';
// The built frontend, resolved relative to backend/dist at runtime.
const frontendDir = path.join(__dirname, '..', '..', 'frontend', 'dist');

// Builds the Express app without binding a port, so tests can call it directly.
export function createApp() {
  const app = express();

  // Behind a TLS-terminating proxy in production, so the secure session cookie works.
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // credentials: true lets the browser send the session cookie; origin: true
  // reflects the caller's origin (a specific origin is required with credentials).
  // In production the frontend is same-origin, so CORS is effectively a no-op there.
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

  // In production, serve the built frontend from the same origin. Anything the
  // API didn't handle returns index.html, so client-side routes work on refresh.
  // (In dev the Vite dev server serves the frontend and proxies /api here.)
  if (isProduction) {
    app.use(express.static(frontendDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next(); // let unknown APIs 404 as JSON
      res.sendFile(path.join(frontendDir, 'index.html'));
    });
  }

  // Unknown routes and errors both end up here, as JSON.
  app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));
  app.use(errorHandler);

  return app;
}
