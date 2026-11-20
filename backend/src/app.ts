import express from 'express';
import cors from 'cors';

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

  return app;
}
