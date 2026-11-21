import EmployeesPage from './features/employees/EmployeesPage';
import styles from './App.module.css';

export default function App() {
  return (
    <main className={styles.page}>
      <h1>Employees</h1>
      <EmployeesPage />
    </main>
  );
}
