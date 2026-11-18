// Self-contained Jest settings, so students only need the tests folder.
// Run from the project root:  npx jest --config tests/jest.config.js
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/newsController.js',
    'models/newsModel.js',
    'routes/newsRoutes.js',
  ],
  coverageThreshold: {
    './controllers/newsController.js': { statements: 80, lines: 80 },
  },
}
