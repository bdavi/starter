/* eslint-disable */
const { readFileSync } = require("fs");

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, "utf-8"),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: "db",
  preset: "../../jest.preset.cjs",
  testEnvironment: "node",
  // The "server-only" marker package resolves to a no-op under Next.js's
  // own bundler (which sets the "react-server" export condition) and to a
  // throwing stub everywhere else, including plain Jest — without this,
  // any file importing "server-only" throws immediately in every test.
  testEnvironmentOptions: {
    customExportConditions: ["node", "react-server"],
  },
  transform: {
    "^.+\\.[tj]s$": ["@swc/jest", swcJestConfig],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "test-output/jest/coverage",
};
