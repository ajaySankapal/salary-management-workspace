import { Router } from 'express';
import { asyncHandler } from '../errors';
import { getEmployee, getEmployees, getFilters, updateEmployeeSalary } from './employees.controller';

// Mounted at /api/employees in app.ts.
export const employeesRouter = Router();

employeesRouter.get('/', asyncHandler(getEmployees));
// /filters must come before /:id so it isn't treated as an employee id.
employeesRouter.get('/filters', asyncHandler(getFilters));
employeesRouter.get('/:id', asyncHandler(getEmployee));
employeesRouter.post('/:id/salary', asyncHandler(updateEmployeeSalary));
