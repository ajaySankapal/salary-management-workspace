-- Up Migration
-- HR accounts that can sign in. Passwords are stored only as a bcrypt hash,
-- never in plain text. username is the unique login handle.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE CONSTRAINT users_username_not_blank CHECK (btrim(username) <> ''),
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE users;
