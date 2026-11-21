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
  // Calls the backend through the Vite dev proxy (/api -> :4000).
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getEmployees: builder.query<EmployeesPage, EmployeesQuery>({
      query: (args) => `employees?${toQueryString(args)}`,
    }),
    getFilterOptions: builder.query<FilterOptions, void>({
      query: () => 'employees/filters',
    }),
    getEmployee: builder.query<Employee, string>({
      query: (id) => `employees/${id}`,
    }),
  }),
});

export const { useGetEmployeesQuery, useGetFilterOptionsQuery, useGetEmployeeQuery } = employeesApi;
