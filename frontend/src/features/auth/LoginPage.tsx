import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation, useRegisterMutation } from '../../api/employeesApi';
import styles from './LoginPage.module.css';

type Mode = 'signin' | 'register';

// Turns an API error into a clear message for the current mode.
function errorMessage(mode: Mode, err: unknown): string {
  const status = (err as { status?: number }).status;
  const serverMessage = (err as { data?: { error?: string } }).data?.error;

  if (mode === 'signin') {
    return status === 401 ? 'Incorrect username or password.' : 'Something went wrong. Please try again.';
  }
  // register
  if (status === 409) return 'That username is already taken.';
  if (status === 400 && serverMessage) return serverMessage; // e.g. password length
  return 'Something went wrong. Please try again.';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [login, { isLoading: signingIn }] = useLoginMutation();
  const [register, { isLoading: registering }] = useRegisterMutation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isRegister = mode === 'register';
  const isLoading = signingIn || registering;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register({ username, password }).unwrap();
      } else {
        await login({ username, password }).unwrap();
      }
      navigate('/'); // after signing in, go to Employees
    } catch (err) {
      setError(errorMessage(mode, err));
    }
  }

  function switchMode() {
    setMode(isRegister ? 'signin' : 'register');
    setError('');
  }

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={onSubmit}>
        <div className={styles.brand}>
          <span className={styles.mark} />
          Salary Workspace
        </div>
        <h1 className={styles.title}>{isRegister ? 'Create your account' : 'Sign in'}</h1>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <label className={styles.field}>
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {isRegister && <p className={styles.hint}>At least 8 characters.</p>}

        <button type="submit" className={styles.submit} disabled={isLoading || !username || !password}>
          {isLoading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>

        <p className={styles.switch}>
          {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
          <button type="button" className={styles.switchButton} onClick={switchMode}>
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </p>
      </form>
    </div>
  );
}
