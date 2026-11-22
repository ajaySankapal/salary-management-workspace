import session from 'express-session';

// Remember who is signed in on the session. Declared here so req.session.user is
// typed everywhere.
declare module 'express-session' {
  interface SessionData {
    user?: { id: number; username: string };
  }
}

// The session middleware: signs the session cookie with SESSION_SECRET from the
// environment. The default (in-memory) store is fine for this single-process MVP;
// a real deployment would use a persistent store (e.g. connect-pg-simple).
export function sessionMiddleware() {
  const secret = process.env.SESSION_SECRET || 'dev-insecure-session-secret';

  return session({
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  });
}
