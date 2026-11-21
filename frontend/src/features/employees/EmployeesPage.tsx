import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetEmployeesQuery, useGetFilterOptionsQuery } from '../../api/employeesApi';
import { formatSalary, formatJoinedDate } from './formatSalary';
import EmployeeDrawer from './EmployeeDrawer';
import styles from './EmployeesPage.module.css';

export default function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
  const search = searchParams.get('search') ?? '';
  const country = searchParams.get('country') ?? '';
  const department = searchParams.get('department') ?? '';
  const jobTitle = searchParams.get('jobTitle') ?? '';

  const { data, isLoading, isError } = useGetEmployeesQuery({
    page,
    search: search || undefined,
    country: country || undefined,
    department: department || undefined,
    jobTitle: jobTitle || undefined,
  });
  const { data: options } = useGetFilterOptionsQuery();

  // Changing a filter or the search resets back to page one.
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  const hasFilters = Boolean(search || country || department || jobTitle);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <h1>Employees</h1>
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          aria-label="Search by name or ID"
          placeholder="Search by name or ID"
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
        <select aria-label="Country" value={country} onChange={(e) => setFilter('country', e.target.value)}>
          <option value="">All countries</option>
          {(options?.countries ?? []).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Department" value={department} onChange={(e) => setFilter('department', e.target.value)}>
          <option value="">All departments</option>
          {(options?.departments ?? []).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select aria-label="Job title" value={jobTitle} onChange={(e) => setFilter('jobTitle', e.target.value)}>
          <option value="">All job titles</option>
          {(options?.jobTitles ?? []).map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
        <button type="button" className={styles.clearButton} onClick={clearFilters} disabled={!hasFilters}>
          Clear filters
        </button>
      </div>

      {isLoading && <p className={styles.status}>Loading employees…</p>}

      {!isLoading && (isError || !data) && (
        <p role="alert" className={`${styles.status} ${styles.error}`}>
          Could not load employees. Please try again.
        </p>
      )}

      {!isLoading && data && data.rows.length === 0 && (
        <p className={styles.status}>No employees match your search and filters.</p>
      )}

      {!isLoading && data && data.rows.length > 0 && (
        <>
          <p className={styles.count}>
            {new Intl.NumberFormat('en-US').format(data.total)} employees
          </p>
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Job title</th>
                  <th className={styles.num}>Current salary</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.id}</td>
                    <td>
                      <button type="button" className={styles.nameButton} onClick={() => setSelectedId(employee.id)}>
                        {employee.name}
                      </button>
                    </td>
                    <td>{employee.email}</td>
                    <td>{employee.country}</td>
                    <td>{employee.jobTitle}</td>
                    <td className={styles.num}>{formatSalary(employee.salary, employee.currency)}</td>
                    <td>{formatJoinedDate(employee.joinedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <nav className={styles.pager} aria-label="Pagination">
              <span className={styles.pageInfo}>
                Page {data.page} of {totalPages}
              </span>
              <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                Previous
              </button>
              <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
                Next
              </button>
            </nav>
          </div>
        </>
      )}

      <EmployeeDrawer employeeId={selectedId} onClose={() => setSelectedId(null)} />
    </section>
  );
}
