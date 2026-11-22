import type { FilterOptions, GroupBy } from '../../api/employeesApi';

// The report controls, shared by the form, the presets, and the text interpreter.
export interface Filters {
  country: string;
  department: string;
  jobTitle: string;
  groupBy: GroupBy;
}

// Which measure to rank the groups by, and the direction.
export type SortKey = 'count' | 'median' | 'average' | 'total';
export interface Sort {
  key: SortKey;
  dir: 'asc' | 'desc';
}

export interface Interpretation {
  filters: Filters;
  sort?: Sort; // set when the question asks for highest/lowest/top etc.
}

// The first known option value that appears in the (lowercased) text, or '' if none.
function findMatch(text: string, values: string[]): string {
  return values.find((value) => text.includes(value.toLowerCase())) ?? '';
}

// Words that signal a grouping/comparison intent next to "country/department/role".
const GROUP_CUE = /\b(across|by|per|each|different|compare|between|vary|varies|varied)\b/;
// Superlatives → rank the groups high-to-low or low-to-high.
const HIGHEST = /\b(highest|top|most|best|largest|biggest|maximum|max)\b/;
const LOWEST = /\b(lowest|least|bottom|smallest|minimum|min|worst)\b/;

// The dimension named in the text, regardless of a "by" cue.
function dimensionInText(q: string): GroupBy | null {
  if (/\bcountr(y|ies)\b/.test(q)) return 'country';
  if (/\bdepartments?\b/.test(q)) return 'department';
  if (/\b(job titles?|roles?)\b/.test(q)) return 'jobTitle';
  return null;
}

// Which number a "highest/lowest" question is about (defaults to median).
function measureInText(q: string): SortKey {
  if (/\b(spend|cost|budget|payroll|total)\b/.test(q)) return 'total';
  if (/\b(average|mean)\b/.test(q)) return 'average';
  if (/\b(headcount|employees|people|count|size)\b/.test(q)) return 'count';
  return 'median';
}

/**
 * Turns a free-text question into the same filter + grouping values the Reports
 * form uses, plus an optional sort when the question asks for a ranking. Supports:
 *   1. "typical salary for <role> in <country>"        → group by job title
 *   2. "how does pay vary by department in <country>"  → group by department
 *   3. "<role> across countries"                       → group by country
 *   4. "highest/lowest paid <department|country|role>" → group by it, sorted
 *
 * Returns null when it can't be matched confidently, so the caller can ask HR to
 * refine the question or use the filters. It does NOT compute anything.
 */
export function interpretQuestion(input: string, options?: FilterOptions): Interpretation | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;

  const country = findMatch(q, options?.countries ?? []);
  const department = findMatch(q, options?.departments ?? []);
  const jobTitle = findMatch(q, options?.jobTitles ?? []);

  // A superlative ("highest/lowest ...") asks to rank the groups.
  let sort: Sort | undefined;
  if (HIGHEST.test(q)) sort = { key: measureInText(q), dir: 'desc' };
  else if (LOWEST.test(q)) sort = { key: measureInText(q), dir: 'asc' };

  const dimension = dimensionInText(q);

  // Decide what to group by: an explicit "by"/comparison phrase or a superlative
  // naming the dimension wins; otherwise infer it from the role/department named.
  let groupBy: GroupBy | null = null;
  if (dimension && (GROUP_CUE.test(q) || sort)) {
    groupBy = dimension;
  } else if (jobTitle) {
    groupBy = 'jobTitle'; // "typical pay for <role> in <country>"
  } else if (department) {
    groupBy = 'department';
  }

  if (!groupBy) return null; // couldn't tell what to group by → unsupported

  return { filters: { country, department, jobTitle, groupBy }, sort };
}
