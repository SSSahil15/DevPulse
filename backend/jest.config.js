module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches:   55,
      functions:  60,
      lines:      60,
    },
  },
  // Pick up __tests__/ (Jest suite) AND test/ (Node-runner-style tests converted to Jest)
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/test/**/*.test.js',
  ],
  // Allow slow async DB operations without Jest's default 5s timeout
  testTimeout: 15000,
  setupFiles: ['./src/__tests__/setup.js'],
};
