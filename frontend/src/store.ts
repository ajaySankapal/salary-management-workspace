import { configureStore } from '@reduxjs/toolkit';
import { employeesApi } from './api/employeesApi';

// A fresh store — the app uses one instance; tests create their own.
export function setupStore() {
  return configureStore({
    reducer: {
      [employeesApi.reducerPath]: employeesApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(employeesApi.middleware),
  });
}

export const store = setupStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
