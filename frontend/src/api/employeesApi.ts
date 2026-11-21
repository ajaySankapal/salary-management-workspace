import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Employee {
  id: string;
  name: string;
  country: string;
  jobTitle: string;
  salary: string; // decimal string
  currency: string;
}

export interface EmployeesPage {
  rows: Employee[];
  page: number;
  pageSize: number;
  total: number;
}

export const employeesApi = createApi({
  reducerPath: 'employeesApi',
  // Calls the backend through the Vite dev proxy (/api -> :4000).
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getEmployees: builder.query<EmployeesPage, number>({
      query: (page) => `employees?page=${page}`,
    }),
  }),
});

export const { useGetEmployeesQuery } = employeesApi;
