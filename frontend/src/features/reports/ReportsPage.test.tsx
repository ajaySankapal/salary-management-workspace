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
  { group: 'India', currency: 'INR', count: 2, median: '1500000.00', average: '1600000.00' },
  { group: 'United States', currency: 'USD', count: 1, median: '120000.00', average: '130000.00' },
];

const indiaRows = [{ group: 'India', currency: 'INR', count: 2, median: '1500000.00', average: '1600000.00' }];

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
