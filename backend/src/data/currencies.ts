export interface Currency {
  /** ISO 4217 code, e.g. 'INR'. */
  code: string;
  name: string;
}

// The currencies this app supports — the single source of truth.
// The database `currencies` table is populated from this list by the seed,
// and the app can import it for validation and display.
// To support a new currency, add an entry here and re-run the seed.
export const CURRENCIES: Currency[] = [
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'Pound Sterling' },
  { code: 'EUR', name: 'Euro' },
  { code: 'SGD', name: 'Singapore Dollar' },
];
