module.exports = {
  runner: '@jest-runner/electron',
  testEnvironment: '@jest-runner/electron/environment',
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  modulePaths: ['<rootDir>/public/node_modules'],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.js'
  ]
};
