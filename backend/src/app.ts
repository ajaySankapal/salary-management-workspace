import express from 'express';
import cors from 'cors';
import { employeesRouter } from './employees/employees.routes';
import { reportsRouter } from './reports/reports.routes';
import { errorHandler, HttpError } from './errors';

// Builds the Express app without binding a port, so tests can call it directly.
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'salary-workspace-api',
      time: new Date().toISOString(),
    });
  });

  app.use('/api/employees', employeesRouter);
  app.use('/api/reports', reportsRouter);

  // Unknown routes and errors both end up here, as JSON.
  app.use((_req, _res, next) => next(new HttpError(404, 'Not found')));
  app.use(errorHandler);

  return app;
}
