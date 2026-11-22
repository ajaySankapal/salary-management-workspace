import type { ReportRow } from '../../api/employeesApi';

// Quote a value if it contains a comma, quote, or newline (standard CSV escaping).
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Turns the current report rows into CSV text. The first column is the group
 * (labelled with the dimension, e.g. "Department"), then currency, count, and the
 * raw decimal amounts (median, average, total) — kept unformatted so the file is
 * usable in a spreadsheet.
 */
export function toReportCsv(rows: ReportRow[], groupLabel: string): string {
  const header = [groupLabel, 'Currency', 'Employees', 'Median', 'Average', 'Total'];
  const lines = [
    header,
    ...rows.map((r) => [r.group, r.currency, String(r.count), r.median, r.average, r.total]),
  ];
  return lines.map((cols) => cols.map(csvCell).join(',')).join('\n');
}
