module.exports = {
  projects: [
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      transform: {
        '^.+\.(ts|tsx|js|jsx)$': ['babel-jest', { babelrc: true }],
      },
      moduleNameMapper: {
        '\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      testMatch: ['<rootDir>/src/__tests__/**/*.test.tsx'],
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/__tests__/**/*.test.js'],
    },
  ],
};
