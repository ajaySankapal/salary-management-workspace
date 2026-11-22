import { NavLink, Route, Routes } from 'react-router-dom';
import { useGetMeQuery, useLogoutMutation } from './api/employeesApi';
import EmployeesPage from './features/employees/EmployeesPage';
import ReportsPage from './features/reports/ReportsPage';
import LoginPage from './features/auth/LoginPage';
import styles from './App.module.css';

export default function App() {
  const { data: me, isLoading } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

  // While we check the session, show nothing busy; then either the app or sign-in.
  if (isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }
  if (!me) {
    return <LoginPage />;
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.brand}>Salary Workspace</span>
        <nav className={styles.nav}>
          <NavLink to="/" end className={linkClass}>
            Employees
          </NavLink>
          <NavLink to="/reports" className={linkClass}>
            Salary Reports
          </NavLink>
        </nav>
        <div className={styles.account}>
          <span className={styles.accountName}>{me.username}</span>
          <button type="button" className={styles.signOut} onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className={styles.page}>
        <div className={styles.pageInner}>
          <Routes>
            <Route path="/" element={<EmployeesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
