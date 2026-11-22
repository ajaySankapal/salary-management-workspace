import { NavLink, Route, Routes } from 'react-router-dom';
import EmployeesPage from './features/employees/EmployeesPage';
import ReportsPage from './features/reports/ReportsPage';
import styles from './App.module.css';

export default function App() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

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
