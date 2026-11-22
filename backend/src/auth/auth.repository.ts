import { query } from '../db/pool';

// A user row as stored in the database.
export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  const { rows } = await query<UserRecord>(
    'SELECT id, username, password_hash FROM users WHERE username = $1',
    [username],
  );
  return rows[0] ?? null;
}

// Inserts a new user. Throws a pg unique-violation (code 23505) if the username
// is already taken; the controller turns that into a 409.
export async function createUser(username: string, passwordHash: string): Promise<{ id: number; username: string }> {
  const { rows } = await query<{ id: number; username: string }>(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, passwordHash],
  );
  return rows[0];
}
