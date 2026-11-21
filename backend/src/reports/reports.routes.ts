import { Router } from 'express';
import { asyncHandler } from '../errors';
import { getSalaryReport } from './reports.controller';

// Mounted at /api/reports in app.ts.
export const reportsRouter = Router();

reportsRouter.get('/', asyncHandler(getSalaryReport));
