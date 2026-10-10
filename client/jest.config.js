/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^@campus-event-finder/shared$': '<rootDir>/../shared/src/index.ts',
  },
};
