import { useState } from 'react';
import { useGetEmployeesQuery } from '../../api/employeesApi';
import styles from './EmployeesPage.module.css';

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetEmployeesQuery(page);

  if (isLoading) {
    return <p>Loading employees…</p>;
  }

  if (isError || !data) {
    return (
      <p role="alert" className={styles.error}>
        Could not load employees. Please try again.
      </p>
    );
  }

  if (data.rows.length === 0) {
    return <p>No employees found.</p>;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <section>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Country</th>
            <th>Job title</th>
            <th>Current salary</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.id}</td>
              <td>{employee.name}</td>
              <td>{employee.country}</td>
              <td>{employee.jobTitle}</td>
              <td>
                {employee.salary} {employee.currency}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <nav className={styles.pager} aria-label="Pagination">
        <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span>
          Page {data.page} of {totalPages}
        </span>
        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </nav>
    </section>
  );
}
