import { interpretQuestion } from './interpretQuestion';

const options = {
  countries: ['Germany', 'India', 'United Kingdom', 'United States'],
  departments: ['Engineering', 'Sales', 'Support'],
  jobTitles: ['Sales Manager', 'Software Engineer', 'Support Lead'],
};

describe('interpretQuestion — supported patterns', () => {
  it('typical pay for a role in a country → group by job title, no sort', () => {
    expect(interpretQuestion('What is the typical salary for software engineers in India?', options)).toEqual({
      filters: { country: 'India', department: '', jobTitle: 'Software Engineer', groupBy: 'jobTitle' },
    });
  });

  it('pay by department in a country → filter country, group by department', () => {
    expect(interpretQuestion('How does pay vary by department in India?', options)).toEqual({
      filters: { country: 'India', department: '', jobTitle: '', groupBy: 'department' },
    });
  });

  it('a role across countries → filter role, group by country', () => {
    expect(interpretQuestion('How do Software Engineer salaries compare across countries?', options)).toEqual({
      filters: { country: '', department: '', jobTitle: 'Software Engineer', groupBy: 'country' },
    });
  });

  it('levels within a department → group by job title', () => {
    expect(interpretQuestion('How does pay vary by job title in Engineering?', options)).toEqual({
      filters: { country: '', department: 'Engineering', jobTitle: '', groupBy: 'jobTitle' },
    });
  });
});

describe('interpretQuestion — rankings (highest / lowest)', () => {
  it('"highest paid department" → group by department, sort by median desc', () => {
    expect(interpretQuestion('Give me the highest paid department', options)).toEqual({
      filters: { country: '', department: '', jobTitle: '', groupBy: 'department' },
      sort: { key: 'median', dir: 'desc' },
    });
  });

  it('"which country pays the lowest" → group by country, sort by median asc', () => {
    expect(interpretQuestion('Which country pays the lowest?', options)).toEqual({
      filters: { country: '', department: '', jobTitle: '', groupBy: 'country' },
      sort: { key: 'median', dir: 'asc' },
    });
  });

  it('"department with the highest total spend" → sort by total desc', () => {
    expect(interpretQuestion('department with the highest total spend', options)).toEqual({
      filters: { country: '', department: '', jobTitle: '', groupBy: 'department' },
      sort: { key: 'total', dir: 'desc' },
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
