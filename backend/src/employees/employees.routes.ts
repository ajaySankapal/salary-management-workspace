import { Router } from 'express';
import { asyncHandler } from '../errors';
import { getEmployees, getFilters } from './employees.controller';

// Mounted at /api/employees in app.ts.
export const employeesRouter = Router();

employeesRouter.get('/', asyncHandler(getEmployees));
employeesRouter.get('/filters', asyncHandler(getFilters));
