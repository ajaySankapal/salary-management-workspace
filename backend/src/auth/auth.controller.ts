import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { HttpError } from '../errors';
import { createUser, findUserByUsername } from './auth.repository';

const BCRYPT_ROUNDS = 10;

// Reads { username, password } from the body, requiring both to be present.
function readCredentials(body: unknown): { username: string; password: string } {
  const { username, password } = (body ?? {}) as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || username.trim() === '') {
    throw new HttpError(400, 'username is required');
  }
  if (typeof password !== 'string' || password === '') {
    throw new HttpError(400, 'password is required');
  }
  return { username: username.trim(), password };
}

// POST /api/auth/register — create an HR account and sign them in.
export async function register(req: Request, res: Response) {
  const { username, password } = readCredentials(req.body);
  if (password.length < 8) {
    throw new HttpError(400, 'password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await createUser(username, passwordHash);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw new HttpError(409, 'That username is already taken');
    }
    throw err;
  }

  req.session.user = { id: user.id, username: user.username };
  res.status(201).json({ username: user.username });
}

// POST /api/auth/login — check the password and start a session.
export async function login(req: Request, res: Response) {
  const { username, password } = readCredentials(req.body);

  const user = await findUserByUsername(username);
  const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !passwordOk) {
    // Same message whether the username or the password was wrong.
    throw new HttpError(401, 'Invalid username or password');
  }

  req.session.user = { id: user.id, username: user.username };
  res.json({ username: user.username });
}

// POST /api/auth/logout — end the session.
export function logout(req: Request, res: Response) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
}

// GET /api/auth/me — who is signed in (used by the frontend to restore state).
export function me(req: Request, res: Response) {
  if (!req.session.user) {
    throw new HttpError(401, 'Not signed in');
  }
  res.json({ username: req.session.user.username });
}
