// Grouping style per currency (India uses the lakh system, e.g. 21,43,000).
const LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'de-DE',
  SGD: 'en-SG',
};

// Formats a salary string as a grouped whole number with its currency code,
// e.g. formatSalary('2143000.00', 'INR') -> '21,43,000 INR'.
export function formatSalary(amount: string, currency: string): string {
  const grouped = new Intl.NumberFormat(LOCALES[currency] ?? 'en-US', {
    maximumFractionDigits: 0,
  }).format(Number(amount));
  return `${grouped} ${currency}`;
}

// Formats a 'YYYY-MM-DD' date as, e.g., '15 Jan 2020'. Builds the date from the
// parts to avoid timezone shifts.
export function formatJoinedDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}
