-- Up Migration
-- A single running counter, bumped whenever the inputs to salary reports change
-- (a committed salary edit, or newly seeded employees). Cached report results are
-- keyed by this version so a change makes stale cache keys unreachable.
-- The boolean primary key + CHECK keeps it to exactly one row.
CREATE TABLE report_data_version (
  id      boolean PRIMARY KEY DEFAULT true,
  version bigint  NOT NULL DEFAULT 1,
  CONSTRAINT report_data_version_singleton CHECK (id)
);

INSERT INTO report_data_version (id) VALUES (true);

-- Down Migration
DROP TABLE report_data_version;
