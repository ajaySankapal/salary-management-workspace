import { Router } from 'express';
import { asyncHandler } from '../errors';
import { getEmployees } from './employees.controller';

// Mounted at /api/employees in app.ts.
export const employeesRouter = Router();

employeesRouter.get('/', asyncHandler(getEmployees));
