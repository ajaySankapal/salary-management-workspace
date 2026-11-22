import { Router } from 'express';
import { asyncHandler } from '../errors';
import { login, logout, me, register } from './auth.controller';

// Mounted at /api/auth in app.ts. These routes are public (no sign-in required).
export const authRouter = Router();

authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/logout', logout);
authRouter.get('/me', asyncHandler(me));
