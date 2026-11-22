import { Fragment, useState } from 'react';
import { useGetFilterOptionsQuery, useGetReportQuery, type GroupBy, type ReportRow } from '../../api/employeesApi';
import { formatSalary } from '../employees/formatSalary';
import { salaryToWords } from '../employees/salaryToWords';
import styles from './ReportsPage.module.css';

const GROUP_LABELS: Record<GroupBy, string> = {
  country: 'Country',
  department: 'Department',
  jobTitle: 'Job title',
};

// All the report's controls, kept in one object so applying a preset, clearing,
// and comparing are each a single step.
interface Filters {
  country: string;
  department: string;
  jobTitle: string;
  groupBy: GroupBy;
}

const EMPTY_FILTERS: Filters = { country: '', department: '', jobTitle: '', groupBy: 'country' };

function sameFilters(a: Filters, b: Filters): boolean {
  return (
    a.country === b.country && a.department === b.department && a.jobTitle === b.jobTitle && a.groupBy === b.groupBy
  );
}

// Ready-made questions from docs/requirements.md. Clicking one fills the filters
// below with these values; HR can then tweak any dropdown.
interface Preset {
  label: string;
  filters: Filters;
}

const PRESETS: Preset[] = [
  {
    label: 'Typical pay for software engineers in India',
    filters: { country: 'India', department: '', jobTitle: 'Software Engineer', groupBy: 'jobTitle' },
  },
  {
    label: 'How pay varies by department in India',
    filters: { country: 'India', department: '', jobTitle: '', groupBy: 'department' },
  },
  {
    label: 'Software Engineer across countries',
    filters: { country: '', department: '', jobTitle: 'Software Engineer', groupBy: 'country' },
  },
];


// Collapses the flat, per-currency rows (already sorted by group) into one entry
// per group, so the group name can be shown once across its currency rows.
function groupRows(rows: ReportRow[]): Array<{ group: string; rows: ReportRow[] }> {
  const groups: Array<{ group: string; rows: ReportRow[] }> = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.group === row.group) last.rows.push(row);
    else groups.push({ group: row.group, rows: [row] });
  }
  return groups;
}

export default function ReportsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const { country, department, jobTitle, groupBy } = filters;

  const { data, isLoading, isError } = useGetReportQuery({
    groupBy,
    country: country || undefined,
    department: department || undefined,
    jobTitle: jobTitle || undefined,
  });
  const { data: options } = useGetFilterOptionsQuery();

  // The preset (if any) whose values match the current filters, so editing any
  // dropdown afterwards turns its pill off on its own.
  const activePreset = PRESETS.find((p) => sameFilters(p.filters, filters));

  // Only show a preset when the values it relies on exist in the data, so it can
  // never quietly apply a filter with no matching option.
  const usablePresets = PRESETS.filter(
    (p) =>
      (!p.filters.country || (options?.countries ?? []).includes(p.filters.country)) &&
      (!p.filters.department || (options?.departments ?? []).includes(p.filters.department)) &&
      (!p.filters.jobTitle || (options?.jobTitles ?? []).includes(p.filters.jobTitle)),
  );

  return (
    <section>
      <h1>Salary Reports</h1>
      <p className={styles.note}>Count, median, and average of annual base pay — shown per currency.</p>

      {usablePresets.length > 0 && (
      <div className={styles.presets}>
        <span className={styles.presetsLabel}>Common questions</span>
        {usablePresets.map((preset) => {
          const isActive = activePreset?.label === preset.label;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={isActive}
              className={isActive ? `${styles.preset} ${styles.presetActive}` : styles.preset}
              onClick={() => setFilters(isActive ? EMPTY_FILTERS : preset.filters)}
            >
              {preset.label}
              {isActive && (
                <span className={styles.presetClear} aria-hidden="true">
                  ×
                </span>
              )}
            </button>
          );
        })}
      </div>
      )}

      <div className={styles.toolbar}>
        <select aria-label="Country" value={country} onChange={(e) => setFilters({ ...filters, country: e.target.value })}>
          <option value="">All countries</option>
          {(options?.countries ?? []).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Department" value={department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
          <option value="">All departments</option>
          {(options?.departments ?? []).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select aria-label="Job title" value={jobTitle} onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value })}>
          <option value="">All job titles</option>
          {(options?.jobTitles ?? []).map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
        <label className={styles.groupBy}>
          Group by
          <select aria-label="Group by" value={groupBy} onChange={(e) => setFilters({ ...filters, groupBy: e.target.value as GroupBy })}>
            <option value="country">Country</option>
            <option value="department">Department</option>
            <option value="jobTitle">Job title</option>
          </select>
        </label>
      </div>

      <div className={styles.legend}>
        <p>
          <strong>Median</strong> — the middle salary: line everyone up from lowest to highest pay and this is
          the person in the middle. Half earn more, half earn less. A few very high or very low salaries do not
          pull it up or down.
        </p>
        <p>
          <strong>Average</strong> — everyone’s pay added together and divided by the number of employees.
          Unlike the median, a few very high or very low salaries can pull it up or down.
        </p>
      </div>

      {isLoading && <p className={styles.status}>Loading report…</p>}

      {!isLoading && isError && (
        <p role="alert" className={`${styles.status} ${styles.error}`}>
          Could not load the report. Please try again.
        </p>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <p className={styles.status}>No results for these filters.</p>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Currency</th>
                <th>Employees</th>
                <th>Median (annual base pay)</th>
                <th>Average (annual base pay)</th>
              </tr>
            </thead>
            <tbody>
              {groupRows(data).map((groupData) => (
                <Fragment key={groupData.group}>
                  <tr className={styles.groupHeaderRow}>
                    <th colSpan={4} scope="colgroup">
                      {GROUP_LABELS[groupBy]}: {groupData.group}
                    </th>
                  </tr>
                  {groupData.rows.map((row) => (
                    <tr key={`${groupData.group}-${row.currency}`}>
                      <td>{row.currency}</td>
                      <td>{row.count}</td>
                      <td>
                        {formatSalary(row.median, row.currency)}
                        <span className={styles.inWords}>{salaryToWords(row.median, row.currency)}</span>
                      </td>
                      <td>
                        {formatSalary(row.average, row.currency)}
                        <span className={styles.inWords}>{salaryToWords(row.average, row.currency)}</span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
