import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetEmployeesQuery, useGetFilterOptionsQuery, type EmployeeSortKey } from '../../api/employeesApi';
import { formatSalary, formatJoinedDate } from './formatSalary';
import { salaryToWords } from './salaryToWords';
import EmployeeDrawer from './EmployeeDrawer';
import styles from './EmployeesPage.module.css';

const SORT_LABELS: Record<EmployeeSortKey, string> = {
  id: 'Employee ID',
  name: 'Name',
  country: 'Country',
  jobTitle: 'Job title',
  salary: 'Current salary',
  joined: 'Joined',
};

export default function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
  const search = searchParams.get('search') ?? '';
  const country = searchParams.get('country') ?? '';
  const department = searchParams.get('department') ?? '';
  const jobTitle = searchParams.get('jobTitle') ?? '';
  const sort = searchParams.get('sort') ?? '';
  const dir = searchParams.get('dir') === 'desc' ? 'desc' : searchParams.get('dir') === 'asc' ? 'asc' : '';

  const { data, isLoading, isError } = useGetEmployeesQuery({
    page,
    search: search || undefined,
    country: country || undefined,
    department: department || undefined,
    jobTitle: jobTitle || undefined,
    sort: (sort || undefined) as EmployeeSortKey | undefined,
    dir: dir || undefined,
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

  // Click a column header to sort: first ascending, then descending, then back to
  // the default (name). Sorting happens in the database, so it covers every page.
  function toggleSort(key: EmployeeSortKey) {
    const next = new URLSearchParams(searchParams);
    if (sort !== key) {
      next.set('sort', key);
      next.set('dir', 'asc');
    } else if (dir === 'asc') {
      next.set('sort', key);
      next.set('dir', 'desc');
    } else {
      next.delete('sort');
      next.delete('dir');
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  }

  function clearSort() {
    const next = new URLSearchParams(searchParams);
    next.delete('sort');
    next.delete('dir');
    next.delete('page');
    setSearchParams(next, { replace: true });
  }

  const activeSort = sort in SORT_LABELS ? (sort as EmployeeSortKey) : null;

  const sortBtnClass = (key: EmployeeSortKey) =>
    sort === key ? `${styles.sortBtn} ${styles.sortActive}` : styles.sortBtn;
  const sortIcon = (key: EmployeeSortKey) => {
    const active = sort === key;
    return (
      <span className={active ? styles.sortIconActive : styles.sortIcon} aria-hidden="true">
        {active ? (dir === 'desc' ? '▼' : '▲') : '↕'}
      </span>
    );
  };

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
          <div className={styles.listMeta}>
            <p className={styles.count}>
              {new Intl.NumberFormat('en-US').format(data.total)} employees
            </p>
            {activeSort && (
              <span className={styles.sortNote}>
                Sorted by {SORT_LABELS[activeSort]} — {dir === 'desc' ? 'descending' : 'ascending'}
                <button type="button" className={styles.sortClear} onClick={clearSort}>
                  Clear
                </button>
              </span>
            )}
          </div>
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <button type="button" className={sortBtnClass('id')} onClick={() => toggleSort('id')} title="Sort by employee ID">
                      Employee ID {sortIcon('id')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className={sortBtnClass('name')} onClick={() => toggleSort('name')} title="Sort by name">
                      Name {sortIcon('name')}
                    </button>
                  </th>
                  <th>Email</th>
                  <th>
                    <button type="button" className={sortBtnClass('country')} onClick={() => toggleSort('country')} title="Sort by country">
                      Country {sortIcon('country')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className={sortBtnClass('jobTitle')} onClick={() => toggleSort('jobTitle')} title="Sort by job title">
                      Job title {sortIcon('jobTitle')}
                    </button>
                  </th>
                  <th className={styles.num}>
                    <button type="button" className={sortBtnClass('salary')} onClick={() => toggleSort('salary')} title="Sort by current salary">
                      Current salary {sortIcon('salary')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className={sortBtnClass('joined')} onClick={() => toggleSort('joined')} title="Sort by joined date">
                      Joined {sortIcon('joined')}
                    </button>
                  </th>
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
                    <td className={styles.num}>
                      {formatSalary(employee.salary, employee.currency)}
                      <span className={styles.inWords}>({salaryToWords(employee.salary, employee.currency)})</span>
                    </td>
                    <td>{formatJoinedDate(employee.joinedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}

      <EmployeeDrawer employeeId={selectedId} onClose={() => setSelectedId(null)} />
    </section>
  );
}
