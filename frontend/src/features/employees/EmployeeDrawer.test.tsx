import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import EmployeesPage from './EmployeesPage';
import { setupStore } from '../../store';

const filterOptions = {
  countries: ['India', 'United States'],
  departments: ['Engineering', 'Sales'],
  jobTitles: ['Sales Manager', 'Software Engineer'],
};

const alice = {
  id: 'EMP-IN',
  name: 'Alice India',
  email: 'alice.india@test.example',
  country: 'India',
  department: 'Engineering',
  jobTitle: 'Software Engineer',
  salary: '1700000.00',
  currency: 'INR',
  joinedDate: '2020-01-15',
};

const indiaList = { rows: [alice], page: 1, pageSize: 10, total: 1 };

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function renderDirectory() {
  return render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={['/?country=India']}>
        <EmployeesPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('employee drawer', () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      let body: unknown;
      if (url.includes('/employees/filters')) body = filterOptions;
      else if (/\/employees\/[^/?]+/.test(url)) body = alice; // details: /employees/:id
      else body = indiaList; // list
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the drawer with the salary (and words), then closes keeping filters', async () => {
    renderDirectory();

    // Open the drawer from the directory.
    fireEvent.click(await screen.findByRole('button', { name: 'Alice India' }));

    // Drawer shows the employee, the salary, and the salary in words.
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('17,00,000 INR')).toBeInTheDocument();
    expect(within(dialog).getByText('Seventeen lakh rupees')).toBeInTheDocument();

    // Close the drawer.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Still on the directory with the India filter applied.
    expect(screen.getByLabelText('Country')).toHaveValue('India');
  });
});
