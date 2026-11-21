/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.integration.test.ts'],
  // Migrations + DB round-trips need more than the 5s default.
  testTimeout: 30000,
};
