module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup.js'],
  testTimeout: 10000,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
  ],
}
