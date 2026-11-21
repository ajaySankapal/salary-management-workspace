import { generateEmployees, EMPLOYEE_COUNT } from './employees';

describe('generateEmployees', () => {
  const employees = generateEmployees();

  it('produces exactly 10,000 employees with stable, sequential IDs', () => {
    expect(employees).toHaveLength(EMPLOYEE_COUNT);
    expect(employees[0].id).toBe('EMP-00001');
    expect(employees[EMPLOYEE_COUNT - 1].id).toBe('EMP-10000');
    expect(new Set(employees.map((e) => e.id)).size).toBe(EMPLOYEE_COUNT);
  });

  it('is deterministic (two runs are identical)', () => {
    expect(generateEmployees()).toEqual(employees);
  });

  it('gives every salary a valid whole, two-decimal amount', () => {
    for (const e of employees) {
      expect(e.annualSalary).toMatch(/^\d+\.00$/); // whole amounts only
      expect(Number(e.annualSalary)).toBeGreaterThan(0);
    }
  });

  it('gives every employee a unique email', () => {
    const emails = employees.map((e) => e.email);
    expect(new Set(emails).size).toBe(EMPLOYEE_COUNT);
    expect(emails[0]).toMatch(/^[a-z0-9.]+@salaryworkspace\.example$/);
  });

  it('keeps duplicate full names low (only a handful per country)', () => {
    const counts = new Map<string, number>();
    for (const e of employees) {
      const key = `${e.country}|${e.name}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const maxRepeat = Math.max(...counts.values());
    expect(maxRepeat).toBeLessThanOrEqual(4);
  });

  // The three example report questions must return useful results.
  it('supports the example report questions', () => {
    const inIndia = employees.filter((e) => e.country === 'India');
    const indiaSWEs = inIndia.filter((e) => e.jobTitle === 'Software Engineer');

    // Q1: typical salary for software engineers in India — needs a real sample.
    expect(indiaSWEs.length).toBeGreaterThan(20);

    // Q2: pay varies by department in India — needs several departments.
    expect(new Set(inIndia.map((e) => e.department)).size).toBeGreaterThanOrEqual(5);

    // Q3: same role across countries — Software Engineer in every country.
    const countriesWithSWE = new Set(
      employees.filter((e) => e.jobTitle === 'Software Engineer').map((e) => e.country),
    );
    expect(countriesWithSWE.size).toBe(4);
  });
});
