export interface SeedEmployee {
  id: string;
  name: string;
  country: string;
  department: string;
  jobTitle: string;
  currency: string;
  annualSalary: string; // numeric(12,2) as a string
}

export const EMPLOYEE_COUNT = 10000;

// A seedable random-number generator. Each call makes the next number from the
// previous one with a fixed formula, then scales it to a 0.0–1.0 fraction.
// Same seed in → same sequence out, so the generated data repeats every run.
function makeRandom(seed: number): () => number {
  const MULTIPLIER = 1103515245;
  const INCREMENT = 12345;
  const MODULUS = 2 ** 31;
  let state = seed;
  return () => {
    state = (state * MULTIPLIER + INCREMENT) % MODULUS;
    return state / MODULUS;
  };
}

// Picks a random item from a list.
function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

// Each country has a currency and a typical local annual salary (the "base"),
// so its numbers look right in its own currency.
const COUNTRIES = [
  { name: 'India', currency: 'INR', base: 1_500_000 },
  { name: 'United States', currency: 'USD', base: 120_000 },
  { name: 'United Kingdom', currency: 'GBP', base: 70_000 },
  { name: 'Germany', currency: 'EUR', base: 75_000 },
  { name: 'Singapore', currency: 'SGD', base: 95_000 },
];

// Each department has job titles, and each title has a pay multiplier applied to
// the country's base. Different titles make departments pay differently.
const DEPARTMENTS = [
  { name: 'Engineering', titles: [
    { title: 'Software Engineer', mult: 1.0 },
    { title: 'Senior Software Engineer', mult: 1.4 },
    { title: 'Engineering Manager', mult: 1.9 },
  ] },
  { name: 'Product', titles: [
    { title: 'Product Analyst', mult: 1.0 },
    { title: 'Product Manager', mult: 1.6 },
    { title: 'Director of Product', mult: 2.3 },
  ] },
  { name: 'Sales', titles: [
    { title: 'Sales Associate', mult: 0.8 },
    { title: 'Account Executive', mult: 1.2 },
    { title: 'Sales Manager', mult: 1.7 },
  ] },
  { name: 'Marketing', titles: [
    { title: 'Marketing Specialist', mult: 0.9 },
    { title: 'Marketing Manager', mult: 1.4 },
  ] },
  { name: 'Finance', titles: [
    { title: 'Financial Analyst', mult: 1.0 },
    { title: 'Finance Manager', mult: 1.6 },
  ] },
  { name: 'Human Resources', titles: [
    { title: 'HR Associate', mult: 0.8 },
    { title: 'HR Manager', mult: 1.4 },
  ] },
  { name: 'Operations', titles: [
    { title: 'Operations Analyst', mult: 0.9 },
    { title: 'Operations Manager', mult: 1.5 },
  ] },
  { name: 'Support', titles: [
    { title: 'Support Specialist', mult: 0.75 },
    { title: 'Support Lead', mult: 1.1 },
  ] },
];

const FIRST_NAMES = ['Asha', 'Liam', 'Mia', 'Noah', 'Priya', 'Ethan', 'Sofia', 'Arjun', 'Emma', 'Chen', 'Olivia', 'Raj', 'Lucas', 'Hannah', 'Yuki', 'Aditya', 'Grace', 'Marco', 'Fatima', 'Jonas'];
const LAST_NAMES = ['Rao', 'Smith', 'Chen', 'Patel', 'Müller', 'Garcia', 'Tan', 'Johnson', 'Kumar', 'Brown', 'Lee', 'Nguyen', 'Schmidt', 'Davis', 'Singh', 'Wilson', 'Ng', 'Khan', 'Weber', 'Lim'];

/** Deterministically generates the full set of fictional employees. */
export function generateEmployees(): SeedEmployee[] {
  const rng = makeRandom(20260101);
  const employees: SeedEmployee[] = [];

  for (let i = 1; i <= EMPLOYEE_COUNT; i++) {
    const country = pick(rng, COUNTRIES);
    const department = pick(rng, DEPARTMENTS);
    const role = pick(rng, department.titles);
    const firstName = pick(rng, FIRST_NAMES);
    const lastName = pick(rng, LAST_NAMES);

    // Salary = country base pay, scaled by the role, with a random ±15% spread.
    const spread = 0.85 + rng() * 0.3;
    const salary = country.base * role.mult * spread;

    employees.push({
      id: `EMP-${String(i).padStart(5, '0')}`,
      name: `${firstName} ${lastName}`,
      country: country.name,
      department: department.name,
      jobTitle: role.title,
      currency: country.currency,
      annualSalary: salary.toFixed(2),
    });
  }

  return employees;
}
