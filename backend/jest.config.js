/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // Integration tests need a database; they run via `npm run test:integration`.
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
};
