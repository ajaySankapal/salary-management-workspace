import type { FilterOptions, GroupBy } from '../../api/employeesApi';

// The report controls, shared by the form, the presets, and the text interpreter.
export interface Filters {
  country: string;
  department: string;
  jobTitle: string;
  groupBy: GroupBy;
}

// The first known option value that appears in the (lowercased) text, or '' if none.
function findMatch(text: string, values: string[]): string {
  return values.find((value) => text.includes(value.toLowerCase())) ?? '';
}

// Words that signal a grouping/comparison intent next to "country/department/role".
const GROUP_CUE = /\b(across|by|per|each|different|compare|between|vary|varies|varied)\b/;

/**
 * Turns a free-text question into the same filter + grouping values the Reports
 * form uses. It supports the three question patterns in docs/requirements.md:
 *   1. "typical salary for <role> in <country>"       → filter role + country, group by job title
 *   2. "how does pay vary by department in <country>" → filter country, group by department
 *   3. "<role> across countries"                      → filter role, group by country
 *
 * Returns null when the text can't be matched confidently (unclear/unsupported),
 * so the caller can ask HR to refine the question or use the filters.
 *
 * It does NOT compute anything — it only produces the query the existing report
 * endpoint already understands.
 */
export function interpretQuestion(input: string, options?: FilterOptions): Filters | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;

  const country = findMatch(q, options?.countries ?? []);
  const department = findMatch(q, options?.departments ?? []);
  const jobTitle = findMatch(q, options?.jobTitles ?? []);

  // Decide what to group by: an explicit phrase wins; otherwise infer it from the
  // role or department named in the question.
  let groupBy: GroupBy | null = null;
  if (/\bcountr(y|ies)\b/.test(q) && GROUP_CUE.test(q)) {
    groupBy = 'country';
  } else if (/\bdepartments?\b/.test(q) && GROUP_CUE.test(q)) {
    groupBy = 'department';
  } else if (/\b(job titles?|roles?)\b/.test(q) && GROUP_CUE.test(q)) {
    groupBy = 'jobTitle';
  } else if (jobTitle) {
    groupBy = 'jobTitle'; // "typical pay for <role> in <country>"
  } else if (department) {
    groupBy = 'department';
  }

  if (!groupBy) return null; // couldn't tell what to group by → unsupported

  return { country, department, jobTitle, groupBy };
}
