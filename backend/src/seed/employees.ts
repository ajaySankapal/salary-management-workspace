import { faker, fakerEN_IN, fakerEN_US, fakerEN_GB, fakerDE, type Faker } from '@faker-js/faker';
import { COUNTRIES, DEPARTMENTS } from './data';

export interface SeedEmployee {
  id: string;
  name: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  currency: string;
  annualSalary: string; // numeric(12,2) as a string
  joinedDate: string; // YYYY-MM-DD
}

export const EMPLOYEE_COUNT = 10000;

// A fixed seed so Faker generates the same data on every run.
const SEED = 20260101;

// A Faker instance per country, so names fit the region.
const NAME_FAKERS: Record<string, Faker> = {
  India: fakerEN_IN,
  'United States': fakerEN_US,
  'United Kingdom': fakerEN_GB,
  Germany: fakerDE,
};

// Makes a name safe to use in an email address: lowercase it, turn the German
// letters into plain ones, then keep only letters and digits (drops spaces etc.).
function slug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ä', 'a')
    .replaceAll('ß', 'ss')
    .replace(/[^a-z0-9]/g, '');
}

/** Deterministically generates the full set of fictional employees. */
export function generateEmployees(): SeedEmployee[] {
  // Seed every Faker instance so the data is identical on every run.
  faker.seed(SEED);
  for (const regionFaker of Object.values(NAME_FAKERS)) regionFaker.seed(SEED);

  const employees: SeedEmployee[] = [];
  const usedEmails = new Set<string>();

  for (let i = 1; i <= EMPLOYEE_COUNT; i++) {
    const country = faker.helpers.arrayElement(COUNTRIES);
    const department = faker.helpers.arrayElement(DEPARTMENTS);
    const role = faker.helpers.arrayElement(department.titles);

    // Region-appropriate name from that country's Faker.
    const regionFaker = NAME_FAKERS[country.name];
    const first = regionFaker.person.firstName();
    const last = regionFaker.person.lastName();

    // Salary: base × role multiplier × ±15%, rounded to a clean thousand.
    const spread = faker.number.float({ min: 0.85, max: 1.15 });
    const salary = Math.round((country.base * role.mult * spread) / 1000) * 1000;

    const joinedDate = faker.date.between({ from: '2016-01-01', to: '2025-12-31' }).toISOString().slice(0, 10);

    // Unique email from the name (add a number if it's already taken).
    let email = `${slug(first)}.${slug(last)}`;
    for (let n = 2; usedEmails.has(email); n++) email = `${slug(first)}${n}.${slug(last)}`;
    usedEmails.add(email);

    employees.push({
      id: `EMP-${String(i).padStart(5, '0')}`,
      name: `${first} ${last}`,
      email: `${email}@salaryworkspace.example`,
      country: country.name,
      department: department.name,
      jobTitle: role.title,
      currency: country.currency,
      annualSalary: salary.toFixed(2),
      joinedDate,
    });
  }

  return employees;
}
