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
  total: string; // decimal string — sum of annual base pay in the group
}

export interface AuthUser {
  username: string;
}

export interface Credentials {
  username: string;
  password: string;
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
  // credentials: 'include' sends the session cookie so protected APIs accept us.
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Employee', 'Me'],
  endpoints: (builder) => ({
    // Who is signed in; errors (401) when nobody is.
    getMe: builder.query<AuthUser, void>({
      query: () => 'auth/me',
      providesTags: ['Me'],
    }),
    login: builder.mutation<AuthUser, Credentials>({
      query: (credentials) => ({ url: 'auth/login', method: 'POST', body: credentials }),
      // Put the signed-in user straight into the getMe cache. (Tag invalidation
      // wouldn't refetch getMe here, because a 401 leaves it in an error state.)
      async onQueryStarted(_credentials, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(employeesApi.util.upsertQueryData('getMe', undefined, data));
        } catch {
          // Wrong credentials — handled in the sign-in form.
        }
      },
    }),
    register: builder.mutation<AuthUser, Credentials>({
      query: (credentials) => ({ url: 'auth/register', method: 'POST', body: credentials }),
      // Registering also signs you in, so cache the new user like login does.
      async onQueryStarted(_credentials, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(employeesApi.util.upsertQueryData('getMe', undefined, data));
        } catch {
          // Validation / duplicate username — handled in the form.
        }
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: 'auth/logout', method: 'POST' }),
      // Clear all cached data so the next person starts clean; getMe then 401s.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(employeesApi.util.resetApiState());
        } catch {
          // ignore
        }
      },
    }),
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
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetEmployeesQuery,
  useGetFilterOptionsQuery,
  useGetEmployeeQuery,
  useUpdateSalaryMutation,
  useGetReportQuery,
} = employeesApi;
