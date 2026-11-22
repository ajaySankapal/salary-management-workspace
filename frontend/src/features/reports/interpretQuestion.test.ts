import { interpretQuestion } from './interpretQuestion';

const options = {
  countries: ['Germany', 'India', 'United Kingdom', 'United States'],
  departments: ['Engineering', 'Sales', 'Support'],
  jobTitles: ['Sales Manager', 'Software Engineer', 'Support Lead'],
};

describe('interpretQuestion — supported patterns', () => {
  it('typical pay for a role in a country → filter by both, group by job title', () => {
    expect(interpretQuestion('What is the typical salary for software engineers in India?', options)).toEqual({
      country: 'India',
      department: '',
      jobTitle: 'Software Engineer',
      groupBy: 'jobTitle',
    });
  });

  it('pay by department in a country → filter by country, group by department', () => {
    expect(interpretQuestion('How does pay vary by department in India?', options)).toEqual({
      country: 'India',
      department: '',
      jobTitle: '',
      groupBy: 'department',
    });
  });

  it('a role across countries → filter by role, group by country', () => {
    expect(interpretQuestion('How do Software Engineer salaries compare across countries?', options)).toEqual({
      country: '',
      department: '',
      jobTitle: 'Software Engineer',
      groupBy: 'country',
    });
  });

  it('levels within a department → filter by department, group by job title', () => {
    expect(interpretQuestion('How does pay vary by job title in Engineering?', options)).toEqual({
      country: '',
      department: 'Engineering',
      jobTitle: '',
      groupBy: 'jobTitle',
    });
  });
});

describe('interpretQuestion — unclear or unsupported', () => {
  it('returns null for empty/blank text', () => {
    expect(interpretQuestion('   ', options)).toBeNull();
  });

  it('returns null for unrelated text', () => {
    expect(interpretQuestion('what is the weather today?', options)).toBeNull();
  });

  it('returns null when it cannot tell what to group by', () => {
    expect(interpretQuestion('show me salaries', options)).toBeNull();
  });
});
