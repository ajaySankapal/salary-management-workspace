// Reference data for the seed generator. Kept separate from the generation
// logic in employees.ts so that file stays easy to read.

export interface Country {
  name: string;
  currency: string;
  base: number; // typical local annual base salary
}

export interface JobTitle {
  title: string;
  mult: number; // pay multiplier applied to the country base
}

export interface Department {
  name: string;
  titles: JobTitle[];
}

// Country configuration: currency and a typical local annual base salary.
export const COUNTRIES: Country[] = [
  { name: 'India', currency: 'INR', base: 1_500_000 },
  { name: 'United States', currency: 'USD', base: 120_000 },
  { name: 'United Kingdom', currency: 'GBP', base: 70_000 },
  { name: 'Germany', currency: 'EUR', base: 75_000 },
];

// Each department's job titles, with a pay multiplier. Different titles make
// departments land at different pay levels.
export const DEPARTMENTS: Department[] = [
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
