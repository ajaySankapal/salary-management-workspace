import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import ReportsPage from './ReportsPage';
import { setupStore } from '../../store';

const filterOptions = {
  countries: ['India', 'United States'],
  departments: ['Engineering', 'Sales'],
  jobTitles: ['Sales Manager', 'Software Engineer'],
};

const allRows = [
  { group: 'India', currency: 'INR', count: 2, median: '1500000.00', average: '1600000.00', total: '3200000.00' },
  { group: 'United States', currency: 'USD', count: 1, median: '120000.00', average: '130000.00', total: '130000.00' },
];

const indiaRows = [
  { group: 'India', currency: 'INR', count: 2, median: '1500000.00', average: '1600000.00', total: '3200000.00' },
];

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function renderReports() {
  return render(
    <Provider store={setupStore()}>
      <ReportsPage />
    </Provider>,
  );
}

describe('ReportsPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      let body: unknown;
      if (url.includes('/employees/filters')) body = filterOptions;
      else if (url.includes('/reports')) body = url.includes('country=India') ? indiaRows : allRows;
      else body = [];
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the report and updates results when a filter changes', async () => {
    renderReports();

    // Unfiltered: both currency rows show.
    expect(await screen.findByText('15,00,000 INR')).toBeInTheDocument();
    expect(screen.getByText('120,000 USD')).toBeInTheDocument();

    // Filter to India: the US row disappears, India stays.
    await screen.findByRole('option', { name: 'India' });
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'India' } });

    await waitFor(() => expect(screen.queryByText('120,000 USD')).not.toBeInTheDocument());
    expect(screen.getByText('15,00,000 INR')).toBeInTheDocument();

    // The India filter reached the API.
    const calledUrls = (global.fetch as jest.Mock).mock.calls.map((c) => urlOf(c[0]));
    expect(calledUrls.some((u: string) => u.includes('/reports') && u.includes('country=India'))).toBe(true);
  });

  it('shows the total (sum) column for each group', async () => {
    renderReports();
    expect(await screen.findByText('Total (annual base pay)')).toBeInTheDocument();
    // India total: 3,200,000 → "32,00,000 INR" in the Indian grouping.
    expect(screen.getByText('32,00,000 INR')).toBeInTheDocument();
  });

  it('exports the current report as a CSV download', async () => {
    const createObjectURL = jest.fn(() => 'blob:mock');
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderReports();
    fireEvent.click(await screen.findByRole('button', { name: /export csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it('fills the filters when the India software-engineer preset is clicked', async () => {
    renderReports();

    // Wait for the filter options so the selects can hold the preset values.
    await screen.findByRole('option', { name: 'India' });

    const preset = screen.getByRole('button', { name: /software engineers in India/i });
    fireEvent.click(preset);

    expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('India');
    expect((screen.getByLabelText('Job title') as HTMLSelectElement).value).toBe('Software Engineer');
    // The pill shows as active once applied.
    expect(preset).toHaveAttribute('aria-pressed', 'true');

    // Both filters are sent to the existing report endpoint.
    await waitFor(() => {
      const calledUrls = (global.fetch as jest.Mock).mock.calls.map((c) => urlOf(c[0]));
      expect(
        calledUrls.some(
          (u: string) =>
            u.includes('/reports') && u.includes('country=India') && u.includes('jobTitle=Software+Engineer'),
        ),
      ).toBe(true);
    });
  });

  it('interprets a supported "Describe a report" question into the filters', async () => {
    renderReports();
    await screen.findByRole('option', { name: 'India' });

    fireEvent.change(screen.getByLabelText(/describe a report/i), {
      target: { value: 'What is the typical salary for software engineers in India?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Interpret' }));

    // Filters are filled (and remain editable) and the interpretation is shown.
    expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('India');
    expect((screen.getByLabelText('Job title') as HTMLSelectElement).value).toBe('Software Engineer');
    expect((screen.getByLabelText('Group by') as HTMLSelectElement).value).toBe('jobTitle');
    expect(screen.getByText(/interpreted as/i)).toHaveTextContent(/grouped by Job title/i);

    // The same single report endpoint is called with the translated filters.
    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c) => urlOf(c[0]));
      expect(
        urls.some(
          (u: string) =>
            u.includes('/reports') && u.includes('country=India') && u.includes('jobTitle=Software+Engineer'),
        ),
      ).toBe(true);
    });
  });

  it('explains when a "Describe a report" question is not understood, leaving filters unchanged', async () => {
    renderReports();
    await screen.findByRole('option', { name: 'India' });

    fireEvent.change(screen.getByLabelText(/describe a report/i), {
      target: { value: 'what is the weather today?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Interpret' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/match that to a report/i);
    expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('');
  });

  it('sorts by a column when its header is clicked, with a clear indicator', async () => {
    renderReports();
    await screen.findByText('15,00,000 INR'); // table has rendered

    fireEvent.click(screen.getByRole('button', { name: /^Median/i }));
    expect(screen.getByText(/highest first/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Median/i })); // flip direction
    expect(screen.getByText(/lowest first/i)).toBeInTheDocument();
  });

  it('interprets "highest paid department" into a department ranking', async () => {
    renderReports();
    await screen.findByRole('option', { name: 'India' });

    fireEvent.change(screen.getByLabelText(/describe a report/i), {
      target: { value: 'Give me the highest paid department' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Interpret' }));

    expect((screen.getByLabelText('Group by') as HTMLSelectElement).value).toBe('department');
    expect(screen.getByText(/interpreted as/i)).toHaveTextContent(/sorted by Median/i);
  });

  it('deselects the preset and clears the filters when clicked again', async () => {
    renderReports();
    await screen.findByRole('option', { name: 'India' });

    const preset = screen.getByRole('button', { name: /software engineers in India/i });
    fireEvent.click(preset);
    expect(preset).toHaveAttribute('aria-pressed', 'true');

    // Clicking the active pill turns it off and clears the filters it set.
    fireEvent.click(preset);
    expect(preset).toHaveAttribute('aria-pressed', 'false');
    expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Job title') as HTMLSelectElement).value).toBe('');
  });
});
