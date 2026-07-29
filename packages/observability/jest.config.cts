/* eslint-disable */
const { readFileSync } = require("fs");

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, "utf-8"),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: "@starter/observability",
  preset: "../../jest.preset.cjs",
  testEnvironment: "node",
  // "server-only" resolves to a throwing stub under Jest's default
  // resolution unless the react-server condition is active — same
  // reasoning as packages/auth/packages/db (see their jest.config.cts).
  testEnvironmentOptions: {
    customExportConditions: ["node", "react-server"],
  },
  transform: {
    "^.+\\.[tjm]s$": ["@swc/jest", swcJestConfig],
  },
  // The OTel JS ecosystem and @sentry/node ship a real amount of
  // ESM-only code — same lesson packages/auth already learned the hard
  // way with better-auth (see its AGENTS.md): an allowlist regex breaks
  // again on every dependency bump that adds a new ESM-only transitive
  // dependency. Transform everything instead.
  transformIgnorePatterns: [],
  moduleFileExtensions: ["ts", "js", "mjs", "html"],
  coverageDirectory: "test-output/jest/coverage",
};
