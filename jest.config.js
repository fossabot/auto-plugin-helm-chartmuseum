/** @type {import('ts-jest').JestConfigWithTsJest} */
// eslint-disable-next-line no-undef
module.exports = {
  collectCoverage: true,
  preset: "ts-jest",
  testEnvironment: "node",
  coverageReporters: ["text", "lcov"],
};
