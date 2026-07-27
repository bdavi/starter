/* eslint-disable */
const { readFileSync } = require("fs");

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, "utf-8"),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: "auth",
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
    "^.+\\.[tjm]s$": ["@swc/jest", swcJestConfig],
  },
  // better-auth ships ESM-only (no CJS build), and so does a real chunk of
  // its own dependency tree (@better-auth/*, @noble/hashes, more) — Jest
  // ignores node_modules by default, so their .mjs/.js ESM files hit Jest's
  // CJS runtime unparsed. Tried an allowlist regex for the specific
  // packages first; abandoned it after the third distinct ESM-only
  // transitive dependency surfaced one at a time — that's an unbounded,
  // ever-growing maintenance burden that breaks again on any dependency
  // bump, not a real fix. Transforming everything (nothing ignored) costs
  // a bit of test-run speed but is the actually robust fix.
  transformIgnorePatterns: [],
  moduleFileExtensions: ["ts", "js", "mjs", "html"],
  coverageDirectory: "test-output/jest/coverage",
};
