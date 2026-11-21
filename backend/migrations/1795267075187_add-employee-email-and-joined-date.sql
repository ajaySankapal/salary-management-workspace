-- Up Migration
-- Email must be unique (full names are not constrained, but emails are the
-- stable per-person identifier). joined_date is the date the employee joined.
ALTER TABLE employees
  ADD COLUMN email       TEXT NOT NULL CONSTRAINT employees_email_not_blank CHECK (btrim(email) <> ''),
  ADD COLUMN joined_date DATE NOT NULL;

ALTER TABLE employees ADD CONSTRAINT employees_email_unique UNIQUE (email);

-- Down Migration
ALTER TABLE employees DROP CONSTRAINT employees_email_unique;
ALTER TABLE employees DROP COLUMN email;
ALTER TABLE employees DROP COLUMN joined_date;
