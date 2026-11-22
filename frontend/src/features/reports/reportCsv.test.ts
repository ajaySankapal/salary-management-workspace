import { toReportCsv } from './reportCsv';
import type { ReportRow } from '../../api/employeesApi';

const rows: ReportRow[] = [
  { group: 'India', currency: 'INR', count: 2, median: '1500000.00', average: '1600000.00', total: '3200000.00' },
  { group: 'United States', currency: 'USD', count: 1, median: '120000.00', average: '120000.00', total: '120000.00' },
];

describe('toReportCsv', () => {
  it('builds a header and one line per row with raw amounts', () => {
    const csv = toReportCsv(rows, 'Country');
    expect(csv).toBe(
      'Country,Currency,Employees,Median,Average,Total\n' +
        'India,INR,2,1500000.00,1600000.00,3200000.00\n' +
        'United States,USD,1,120000.00,120000.00,120000.00',
    );
  });

  it('quotes values that contain a comma', () => {
    const csv = toReportCsv(
      [{ group: 'Research, Dev', currency: 'EUR', count: 3, median: '90000.00', average: '91000.00', total: '273000.00' }],
      'Department',
    );
    expect(csv).toContain('"Research, Dev",EUR,3,90000.00,91000.00,273000.00');
  });
});
