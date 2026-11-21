import * as Dialog from '@radix-ui/react-dialog';
import { useGetEmployeeQuery } from '../../api/employeesApi';
import { formatSalary, formatJoinedDate } from './formatSalary';
import { salaryToWords } from './salaryToWords';
import styles from './EmployeeDrawer.module.css';

interface Props {
  employeeId: string | null;
  onClose: () => void;
}

// A slide-over panel showing one employee's details (read-only).
export default function EmployeeDrawer({ employeeId, onClose }: Props) {
  const { data, isLoading, isError } = useGetEmployeeQuery(employeeId ?? '', { skip: employeeId === null });

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
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
