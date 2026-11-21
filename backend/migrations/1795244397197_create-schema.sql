-- Up Migration

-- Reference table of valid currencies (ISO 4217 codes). Rows are loaded by the
-- seed from the app's currency list, not here: migrations define structure only.
-- The format check keeps codes to three uppercase letters.
CREATE TABLE currencies (
  code TEXT PRIMARY KEY CONSTRAINT currencies_code_format    CHECK (code ~ '^[A-Z]{3}$'),
  name TEXT NOT NULL    CONSTRAINT currencies_name_not_blank CHECK (btrim(name) <> '')
);

-- Each row stores one employee's current annual base salary in the currency
-- named in that same row. currency must be a known currency (foreign key),
-- so bad or unknown codes cannot be written.
CREATE TABLE employees (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL CONSTRAINT employees_name_not_blank       CHECK (btrim(name) <> ''),
  country       TEXT NOT NULL CONSTRAINT employees_country_not_blank    CHECK (btrim(country) <> ''),
  department    TEXT NOT NULL CONSTRAINT employees_department_not_blank CHECK (btrim(department) <> ''),
  job_title     TEXT NOT NULL CONSTRAINT employees_job_title_not_blank  CHECK (btrim(job_title) <> ''),
  currency      TEXT NOT NULL REFERENCES currencies(code),
  annual_salary NUMERIC(12, 2) NOT NULL CONSTRAINT employees_annual_salary_range
                  CHECK (annual_salary >= 0.01 AND annual_salary <= 9999999999.99)
);

-- Down Migration
DROP TABLE employees;
DROP TABLE currencies;
