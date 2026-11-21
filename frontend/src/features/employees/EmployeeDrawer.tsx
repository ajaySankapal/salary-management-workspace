import { useEffect, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useGetEmployeeQuery, useUpdateSalaryMutation } from '../../api/employeesApi';
import { formatSalary, formatJoinedDate } from './formatSalary';
import { salaryToWords } from './salaryToWords';
import styles from './EmployeeDrawer.module.css';

interface Props {
  employeeId: string | null;
  onClose: () => void;
}

// A slide-over panel showing one employee's details, with a salary-update form.
export default function EmployeeDrawer({ employeeId, onClose }: Props) {
  const { data, isLoading, isError, refetch } = useGetEmployeeQuery(employeeId ?? '', { skip: employeeId === null });
  const [updateSalary, { isLoading: isSaving }] = useUpdateSalaryMutation();

  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [stale, setStale] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form whenever a different employee is opened.
  useEffect(() => {
    setEditing(false);
    setAmount('');
    setReason('');
    setStale(false);
    setFormError(null);
  }, [employeeId]);

  function cancelEdit() {
    setEditing(false);
    setAmount('');
    setReason('');
    setStale(false);
    setFormError(null);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setFormError(null);
    setStale(false);
    try {
      await updateSalary({ id: data.id, amount, reason, previousAmount: data.salary }).unwrap();
      setAmount('');
      setReason('');
      setEditing(false);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        setStale(true);
      } else if (status === 400) {
        const message = (err as { data?: { error?: string } }).data?.error;
        setFormError(message ?? 'Please check the amount and reason.');
      } else {
        setFormError('Could not save. Please try again.');
      }
    }
  }

  function reload() {
    setStale(false);
    refetch();
  }

  return (
    <Dialog.Root open={employeeId !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.drawer} aria-describedby={undefined}>
          <Dialog.Close className={styles.close} aria-label="Close">
            ×
          </Dialog.Close>

          <Dialog.Title className={styles.title}>{data?.name ?? 'Employee'}</Dialog.Title>

          {isLoading && <p className={styles.status}>Loading employee…</p>}

          {!isLoading && (isError || !data) && (
            <p role="alert" className={styles.error}>
              Employee not found.
            </p>
          )}

          {!isLoading && data && (
            <>
              <dl className={styles.details}>
                <div>
                  <dt>Employee ID</dt>
                  <dd>{data.id}</dd>
                </div>
                <div>
                  <dt>Country</dt>
                  <dd>{data.country}</dd>
                </div>
                <div>
                  <dt>Department</dt>
                  <dd>{data.department}</dd>
                </div>
                <div>
                  <dt>Job title</dt>
                  <dd>{data.jobTitle}</dd>
                </div>
                <div>
                  <dt>Current annual base salary</dt>
                  <dd>
                    {formatSalary(data.salary, data.currency)}
                    <span className={styles.inWords}>{salaryToWords(data.salary, data.currency)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{data.email}</dd>
                </div>
                <div>
                  <dt>Joined</dt>
                  <dd>{formatJoinedDate(data.joinedDate)}</dd>
                </div>
              </dl>

              {!editing && (
                <button type="button" className={styles.updateCta} onClick={() => setEditing(true)}>
                  Update salary record
                </button>
              )}

              {editing && (
                <form className={styles.form} onSubmit={handleSave}>
                  <h3 className={styles.sectionTitle}>Update salary record</h3>
                  <p className={styles.currentNote}>Current: {formatSalary(data.salary, data.currency)}</p>

                  <label className={styles.field}>
                    <span>New amount ({data.currency})</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Reason</span>
                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
                  </label>

                  {formError && (
                    <p role="alert" className={styles.error}>
                      {formError}
                    </p>
                  )}

                  {stale && (
                    <div role="alert" className={styles.stale}>
                      <p>This record was changed by someone else. Reload to see the latest, then try again.</p>
                      <button type="button" onClick={reload}>
                        Reload
                      </button>
                    </div>
                  )}

                  <div className={styles.formActions}>
                    <button type="submit" className={styles.save} disabled={isSaving || !amount || reason.trim() === ''}>
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className={styles.cancel} onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <section className={styles.history}>
                <h3 className={styles.sectionTitle}>Salary history</h3>
                {data.history.length === 0 ? (
                  <p className={styles.status}>No changes yet.</p>
                ) : (
                  <ul className={styles.historyList}>
                    {data.history.map((h) => (
                      <li key={h.id}>
                        <span>
                          {h.previousAmount ? formatSalary(h.previousAmount, data.currency) : '—'} →{' '}
                          {formatSalary(h.newAmount, data.currency)}
                        </span>
                        <span className={styles.historyMeta}>
                          {h.reason} · {formatJoinedDate(h.changedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
