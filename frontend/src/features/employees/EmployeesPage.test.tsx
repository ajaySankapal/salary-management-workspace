import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import EmployeesPage from './EmployeesPage';
import { setupStore } from '../../store';

const filterOptions = {
  countries: ['India', 'United States'],
  departments: ['Engineering', 'Sales'],
  jobTitles: ['Sales Manager', 'Software Engineer'],
};

const fullPage1 = {
  rows: [
    { id: 'EMP-IN', name: 'Alice India', email: 'alice.india@test.example', country: 'India', jobTitle: 'Software Engineer', salary: '1000000.00', currency: 'INR', joinedDate: '2020-01-15' },
    { id: 'EMP-US', name: 'Bob America', email: 'bob.america@test.example', country: 'United States', jobTitle: 'Sales Manager', salary: '150000.00', currency: 'USD', joinedDate: '2019-07-01' },
  ],
  page: 1,
  pageSize: 25,
  total: 30,
};

const fullPage2 = {
  rows: [
    { id: 'EMP-IN2', name: 'Carol Page2', email: 'carol.page2@test.example', country: 'India', jobTitle: 'Software Engineer', salary: '900000.00', currency: 'INR', joinedDate: '2021-03-10' },
  ],
  page: 2,
  pageSize: 25,
  total: 30,
};

const indiaOnly = {
  rows: [fullPage1.rows[0]],
  page: 1,
  pageSize: 25,
  total: 1,
};

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function renderPage() {
  return render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={['/']}>
        <EmployeesPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('EmployeesPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      let body: unknown;
      if (url.includes('/filters')) body = filterOptions;
      else if (url.includes('country=India')) body = indiaOnly;
      else if (url.includes('page=2')) body = fullPage2;
      else body = fullPage1;
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads page one, then requests and shows page two on Next', async () => {
    renderPage();

    expect(await screen.findByText('Alice India')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Carol Page2')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    const requestedUrls = (global.fetch as jest.Mock).mock.calls.map((call) => urlOf(call[0]));
    expect(requestedUrls.some((u: string) => u.includes('page=2'))).toBe(true);
  });

  it('shows only the matching rows after applying a country filter', async () => {
    renderPage();

    // Unfiltered: both employees show.
    expect(await screen.findByText('Alice India')).toBeInTheDocument();
    expect(screen.getByText('Bob America')).toBeInTheDocument();

    // Apply the India filter (option comes from the filter-options endpoint).
    await screen.findByRole('option', { name: 'India' });
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'India' } });

    // After the filtered results load, only the India employee is shown.
    await waitFor(() => expect(screen.queryByText('Bob America')).not.toBeInTheDocument());
    expect(screen.getByText('Alice India')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeEnabled();

    const requestedUrls = (global.fetch as jest.Mock).mock.calls.map((call) => urlOf(call[0]));
    expect(requestedUrls.some((u: string) => u.includes('country=India'))).toBe(true);
  });

  it('sorts by a column when its header is clicked', async () => {
    renderPage();
    await screen.findByText('Alice India');

    // First click → ascending.
    fireEvent.click(screen.getByRole('button', { name: /current salary/i }));
    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c) => urlOf(c[0]));
      expect(urls.some((u: string) => u.includes('sort=salary') && u.includes('dir=asc'))).toBe(true);
    });

    // Second click → descending.
    fireEvent.click(screen.getByRole('button', { name: /current salary/i }));
    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c) => urlOf(c[0]));
      expect(urls.some((u: string) => u.includes('sort=salary') && u.includes('dir=desc'))).toBe(true);
    });
  });
});
