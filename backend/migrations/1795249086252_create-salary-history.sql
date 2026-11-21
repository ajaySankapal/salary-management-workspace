-- Up Migration
-- Append-only log of salary changes. The employee's current salary lives on
-- employees.annual_salary; each change also records a row here so HR can see
-- the previous amount, the new amount, the reason, and when it changed.
CREATE TABLE salary_history (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id     TEXT NOT NULL REFERENCES employees(id),
  previous_amount NUMERIC(12, 2),
  new_amount      NUMERIC(12, 2) NOT NULL CONSTRAINT salary_history_new_amount_range
                    CHECK (new_amount >= 0.01 AND new_amount <= 9999999999.99),
  reason          TEXT NOT NULL CONSTRAINT salary_history_reason_not_blank CHECK (btrim(reason) <> ''),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE salary_history;
