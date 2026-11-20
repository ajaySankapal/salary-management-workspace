import { render, screen } from '@testing-library/react';
import App from './App';

describe('App (starter page)', () => {
  it('shows the app title and an initialized message', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Salary Workspace' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Frontend is initialized.')).toBeInTheDocument();
  });
});
