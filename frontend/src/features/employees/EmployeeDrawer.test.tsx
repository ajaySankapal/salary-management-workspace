import { render, screen, fireEvent, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import EmployeesPage from './EmployeesPage';
import { setupStore } from '../../store';

const filterOptions = {
  countries: ['India', 'United States'],
  departments: ['Engineering', 'Sales'],
  jobTitles: ['Sales Manager', 'Software Engineer'],
};

const baseEmployee = {
  id: 'EMP-IN',
  name: 'Alice India',
  email: 'alice.india@test.example',
  country: 'India',
  department: 'Engineering',
  jobTitle: 'Software Engineer',
  salary: '1000000.00',
  currency: 'INR',
  joinedDate: '2020-01-15',
};

const indiaList = { rows: [baseEmployee], page: 1, pageSize: 10, total: 1 };

// Mutable detail the fake server returns from GET /employees/:id.
let detail: typeof baseEmployee & { history: Array<Record<string, unknown>> };

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (typeof input !== 'string' && !(input instanceof URL)) return input.method;
  return init?.method ?? 'GET';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
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

// Installs a fake server. `onSave` decides what POST /salary does.
function installFetch(onSave: () => Response) {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    if (methodOf(input, init) === 'POST' && url.includes('/salary')) return Promise.resolve(onSave());
    if (url.includes('/employees/filters')) return Promise.resolve(json(filterOptions));
    if (/\/employees\/[^/?]+/.test(url)) return Promise.resolve(json(detail)); // GET details
    return Promise.resolve(json(indiaList)); // list
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  detail = { ...baseEmployee, history: [] };
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function openDrawerAndFillForm() {
  renderDirectory();
  fireEvent.click(await screen.findByRole('button', { name: 'Alice India' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText('10,00,000 INR'); // details loaded
  fireEvent.click(within(dialog).getByRole('button', { name: 'Update salary record' })); // open the form
  fireEvent.change(within(dialog).getByLabelText(/New amount/), { target: { value: '1200000' } });
  fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Annual raise' } });
  return dialog;
}

describe('EmployeeDrawer salary update', () => {
  it('saves a new salary and shows the updated amount and history entry', async () => {
    installFetch(() => {
      // Successful save: the server now returns the updated salary + history.
      detail = {
        ...baseEmployee,
        salary: '1200000.00',
        history: [
          { id: 1, previousAmount: '1000000.00', newAmount: '1200000.00', reason: 'Annual raise', changedAt: '2026-11-22' },
        ],
      };
      return json({ ...baseEmployee, salary: '1200000.00' });
    });

    const dialog = await openDrawerAndFillForm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    // Updated salary and the new history entry appear.
    expect(await within(dialog).findByText('12,00,000 INR')).toBeInTheDocument();
    expect(within(dialog).getByText(/Annual raise/)).toBeInTheDocument();
    expect(within(dialog).getByText(/10,00,000 INR → 12,00,000 INR/)).toBeInTheDocument();
  });

  it('shows the stale-edit message when another update happened first', async () => {
    installFetch(() => json({ error: 'This record was changed by someone else.' }, 409));

    const dialog = await openDrawerAndFillForm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/changed by someone else/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    // Salary unchanged.
    expect(within(dialog).getByText('10,00,000 INR')).toBeInTheDocument();
  });
});
