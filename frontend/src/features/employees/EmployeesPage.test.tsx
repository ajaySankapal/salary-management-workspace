import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import EmployeesPage from './EmployeesPage';
import { setupStore } from '../../store';

const page1 = {
  rows: [
    { id: 'EMP-001', name: 'Alice Page1', country: 'India', jobTitle: 'Software Engineer', salary: '1000000.00', currency: 'INR' },
  ],
  page: 1,
  pageSize: 25,
  total: 30,
};

const page2 = {
  rows: [
    { id: 'EMP-026', name: 'Bob Page2', country: 'United States', jobTitle: 'Product Manager', salary: '150000.00', currency: 'USD' },
  ],
  page: 2,
  pageSize: 25,
  total: 30,
};

// Reads the URL from whatever form fetch was called with.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function renderPage() {
  return render(
    <Provider store={setupStore()}>
      <EmployeesPage />
    </Provider>,
  );
}

describe('EmployeesPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const body = urlOf(input).includes('page=2') ? page2 : page1;
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

    // Page one shows, Previous is disabled.
    expect(await screen.findByText('Alice Page1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // Page two is fetched and shown, Next is now disabled.
    expect(await screen.findByText('Bob Page2')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    // The screen actually requested page two.
    const requestedUrls = (global.fetch as jest.Mock).mock.calls.map((call) => urlOf(call[0]));
    expect(requestedUrls.some((u: string) => u.includes('page=2'))).toBe(true);
  });
});
