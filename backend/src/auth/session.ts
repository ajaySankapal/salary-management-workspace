import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { getPool } from '../db/pool';

// Remember who is signed in on the session. Declared here so req.session.user is
// typed everywhere.
declare module 'express-session' {
  interface SessionData {
    user?: { id: number; username: string };
  }
}

// The session middleware: signs the session cookie with SESSION_SECRET from the
// environment. In production, sessions are stored in PostgreSQL (so they survive
// restarts and work across instances); in dev/test the default in-memory store is
// used, which keeps the tests dependency-free.
export function sessionMiddleware() {
  const secret = process.env.SESSION_SECRET || 'dev-insecure-session-secret';
  const isProd = process.env.NODE_ENV === 'production';

  // The cookie is "secure" (HTTPS-only) in production. Set COOKIE_SECURE=false to
  // override — e.g. to try the production build locally over plain http://localhost.
  const cookieSecure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd;

  const store = isProd
    ? new (connectPgSimple(session))({ pool: getPool(), createTableIfMissing: true })
    : undefined; // default MemoryStore in dev/test

  return session({
    store,
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure, // HTTPS-only in prod (see trust proxy in app.ts)
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  });
}
