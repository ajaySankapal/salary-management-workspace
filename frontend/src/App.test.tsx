import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { setupStore } from './store';

const DEMO = { username: 'hr@salary.demo', password: 'salary-demo-123' };

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// RTK Query passes a Request object to fetch, so the request body lives there
// rather than in an init argument.
async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  if (typeof init?.body === 'string') return init.body;
  if (input && typeof (input as Request).text === 'function') {
    try {
      return await (input as Request).text();
    } catch {
      return '{}';
    }
  }
  return '{}';
}

function renderApp() {
  return render(
    <Provider store={setupStore()}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </Provider>,
  );
}

describe('App sign-in flow', () => {
  // The fake backend tracks whether we are signed in, like a real session would.
  let signedIn = false;

  beforeEach(() => {
    signedIn = false;
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = urlOf(input);

      if (url.includes('/auth/me')) {
        return signedIn ? json({ username: DEMO.username }) : json({ error: 'Not signed in' }, 401);
      }
      if (url.includes('/auth/register')) {
        const body = JSON.parse(await readBody(input, init));
        if (body.username === 'existing@demo') return json({ error: 'That username is already taken' }, 409);
        signedIn = true;
        return json({ username: body.username });
      }
      if (url.includes('/auth/login')) {
        const body = JSON.parse(await readBody(input, init));
        if (body.password === DEMO.password) {
          signedIn = true;
          return json({ username: body.username });
        }
        return json({ error: 'Invalid username or password' }, 401);
      }
      if (url.includes('/employees/filters')) return json({ countries: [], departments: [], jobTitles: [] });
      if (url.includes('/employees')) return json({ rows: [], page: 1, pageSize: 10, total: 0 });
      return json([]);
    }) as unknown as typeof fetch;
  });

  afterEach(() => jest.restoreAllMocks());

  it('signs in with valid credentials and lands on Employees', async () => {
    renderApp();

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: DEMO.username } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: DEMO.password } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // The authenticated app appears: Sign out action + the Employees nav link.
    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Employees' })).toBeInTheDocument();
  });

  it('shows a clear message when the credentials are wrong', async () => {
    renderApp();

    fireEvent.change(await screen.findByLabelText('Username'), { target: { value: DEMO.username } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect username or password/i);
    // Still on the sign-in screen (no Sign out action).
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('registers a new account and lands on Employees', async () => {
    renderApp();
    await screen.findByLabelText('Username');

    fireEvent.click(screen.getByRole('button', { name: 'Register' })); // switch to register
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'new.person@demo' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('shows a clear message when the username is already taken', async () => {
    renderApp();
    await screen.findByLabelText('Username');

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'existing@demo' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already taken/i);
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });
});
