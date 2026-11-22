import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Employee {
  id: string;
  name: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  salary: string; // decimal string
  currency: string;
  joinedDate: string; // YYYY-MM-DD
}

export interface SalaryHistoryEntry {
  id: number;
  previousAmount: string | null;
  newAmount: string;
  reason: string;
  changedAt: string; // YYYY-MM-DD
}

export interface EmployeeDetails extends Employee {
  history: SalaryHistoryEntry[];
}

export interface EmployeesPage {
  rows: Employee[];
  page: number;
  pageSize: number;
  total: number;
}

export interface EmployeesQuery {
  page: number;
  search?: string;
  country?: string;
  department?: string;
  jobTitle?: string;
}

export interface FilterOptions {
  countries: string[];
  departments: string[];
  jobTitles: string[];
}

export interface SalaryUpdateInput {
  id: string;
  amount: string;
  reason: string;
  previousAmount: string;
}

export type GroupBy = 'country' | 'department' | 'jobTitle';

export interface ReportQuery {
  groupBy: GroupBy;
  country?: string;
  department?: string;
  jobTitle?: string;
}

export interface ReportRow {
  group: string;
  currency: string;
  count: number;
  median: string; // decimal string
  average: string; // decimal string
}

function toQueryString(args: EmployeesQuery): string {
  const params = new URLSearchParams();
  params.set('page', String(args.page));
  if (args.search) params.set('search', args.search);
  if (args.country) params.set('country', args.country);
  if (args.department) params.set('department', args.department);
  if (args.jobTitle) params.set('jobTitle', args.jobTitle);
  return params.toString();
}

export const employeesApi = createApi({
  reducerPath: 'employeesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Employee'],
  endpoints: (builder) => ({
    getEmployees: builder.query<EmployeesPage, EmployeesQuery>({
      query: (args) => `employees?${toQueryString(args)}`,
      providesTags: (result) =>
        result
          ? [...result.rows.map((e) => ({ type: 'Employee' as const, id: e.id })), { type: 'Employee' as const, id: 'LIST' }]
          : [{ type: 'Employee' as const, id: 'LIST' }],
    }),
    getFilterOptions: builder.query<FilterOptions, void>({
      query: () => 'employees/filters',
    }),
    getEmployee: builder.query<EmployeeDetails, string>({
      query: (id) => `employees/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Employee', id }],
    }),
    updateSalary: builder.mutation<Employee, SalaryUpdateInput>({
      query: ({ id, amount, reason, previousAmount }) => ({
        url: `employees/${id}/salary`,
        method: 'POST',
        body: { amount, reason, previousAmount },
      }),
      // Refresh the open employee and the list after a successful change.
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Employee', id },
        { type: 'Employee', id: 'LIST' },
      ],
    }),
    getReport: builder.query<ReportRow[], ReportQuery>({
      query: ({ groupBy, country, department, jobTitle }) => {
        const params = new URLSearchParams();
        params.set('groupBy', groupBy);
        if (country) params.set('country', country);
        if (department) params.set('department', department);
        if (jobTitle) params.set('jobTitle', jobTitle);
        return `reports?${params.toString()}`;
      },
      // Reports are built from current salaries, so a salary change refreshes them.
      providesTags: [{ type: 'Employee', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useGetFilterOptionsQuery,
  useGetEmployeeQuery,
  useUpdateSalaryMutation,
  useGetReportQuery,
} = employeesApi;
