import nx from "@nx/eslint-plugin";
import sonarjs from "eslint-plugin-sonarjs";
import security from "eslint-plugin-security";
import importX from "eslint-plugin-import-x";
import n from "eslint-plugin-n";
import jest from "eslint-plugin-jest";
import prettierConfig from "eslint-config-prettier";

export default [
  ...nx.configs["flat/base"],
  ...nx.configs["flat/typescript"],
  ...nx.configs["flat/javascript"],
  sonarjs.configs.recommended,
  security.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    settings: {
      "import-x/resolver": {
        typescript: true,
      },
    },
    rules: {
      // Off by default in import-x's recommended config (expensive); ADR-00009
      // calls this out specifically for monorepo circular-dependency detection.
      "import-x/no-cycle": "error",
      // Unreliable with CJS/ESM interop (false positives on packages like
      // @nx/eslint-plugin and react) — tsc already checks import correctness
      // more reliably using real type information.
      "import-x/default": "off",
      "import-x/no-named-as-default-member": "off",
      "import-x/no-named-as-default": "off",
    },
  },
  {
    ignores: ["**/dist", "**/out-tsc", "**/test-output"],
  },
  {
    // Scoped to .ts/.tsx source only — .mjs/.cjs files (eslint.config.mjs,
    // jest.config.cts, ...) genuinely need explicit extensions, since
    // they're executed directly by Node's own ESM/CJS loader rather than
    // resolved by a bundler or tsc.
    //
    // A relative import ending in ".js" looks like it's asking for a real
    // .js file, but under TypeScript's nodenext-style resolution it refers
    // to the neighboring ".ts" file instead — which Next.js's bundler
    // (Turbopack and webpack both, confirmed) cannot resolve when
    // consuming a workspace package as raw source via `transpilePackages`.
    // This is exactly the bug that broke packages/config/db/auth once
    // already (ADR-00011's Consequences). Tried `import-x/extensions`
    // first; abandoned it after verifying empirically that it does *not*
    // catch this specific case (`./foo.js` resolving to a real `foo.ts`
    // slips through regardless of its `never`/`always` config — confirmed
    // by deliberately reintroducing the exact regression and re-linting).
    // `no-restricted-syntax` with a direct AST selector on the import
    // source string is precise and doesn't depend on resolver behavior.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportDeclaration[source.value=/^\\.{1,2}\\/.*\\.js$/], ExportNamedDeclaration[source.value=/^\\.{1,2}\\/.*\\.js$/], ExportAllDeclaration[source.value=/^\\.{1,2}\\/.*\\.js$/]",
          message:
            "Don't use a .js extension on a relative import/export — write the path with no extension. A .js extension here doesn't mean 'this file is .js', it means 'this resolves to a .ts file with nodenext-style resolution', which Next.js's bundler can't handle when consuming a workspace package as source.",
        },
      ],
    },
  },
  {
    plugins: { n },
    rules: {
      // ADR-00013: env vars must be read through a package's own
      // createEnvGetter-based getter, never process.env directly — so
      // access to a given secret follows the import graph (only code that
      // imports packages/db can reach DATABASE_URL) instead of being
      // ambient/global by default. See the exception below for the one
      // file that's actually allowed to touch process.env.
      "n/no-process-env": "error",
    },
  },
  {
    // ADR-00007: "a strong, explicit commitment to automated testing... a
    // real requirement, not an aspiration to be traded off under time
    // pressure." A stray committed test.only()/describe.only() silently
    // drops the rest of that suite from every CI run without failing
    // anything — the standard footgun a commitment like that should guard
    // against. Scoped to Jest-based unit/integration spec files only —
    // apps/web-e2e's Playwright specs already get the equivalent via
    // playwright/no-focused-test + playwright/no-skipped-test, bundled in
    // its own flat/recommended config.
    files: ["**/*.spec.ts", "**/*.test.ts"],
    ignores: ["apps/web-e2e/**"],
    plugins: { jest },
    rules: {
      "jest/no-focused-tests": "error",
      "jest/no-disabled-tests": "error",
    },
  },
  {
    // The createEnvGetter implementation is the only application/library
    // code allowed to touch process.env directly — everything else,
    // including packages/db's and packages/auth's own env.ts files, goes
    // through it. Test files that manipulate process.env to exercise
    // validation are also legitimate (testing the env-parsing behavior
    // itself, not bypassing it), and tooling config files (e.g.
    // playwright.config.mts's own process.env.CI check) aren't part of the
    // app/package runtime this rule is about.
    files: [
      "**/create-env-getter.ts",
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/playwright.config.mts",
    ],
    rules: {
      "n/no-process-env": "off",
    },
  },
  {
    // Auto-generated by Next.js ("This file should not be edited") and
    // gitignored (not committed). Nx's `typegen` target (a `dependsOn` of
    // `lint`/`typecheck`) regenerates it before either runs, so this is
    // mostly defense in depth — e.g. an IDE invoking `eslint` directly,
    // bypassing Nx's dependency graph, on a checkout where nothing has
    // triggered typegen yet.
    files: ["**/next-env.d.ts"],
    rules: {
      "import-x/no-unresolved": "off",
      // Next.js's own generator writes this exact import verbatim
      // (import "./.next/types/routes.d.ts") — not the nodenext .js-means-.ts
      // convention the extensions rule elsewhere is guarding against.
      "import-x/extensions": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"],
          depConstraints: [
            {
              sourceTag: "*",
              onlyDependOnLibsWithTags: ["*"],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "**/*.ts",
      "**/*.tsx",
      "**/*.cts",
      "**/*.mts",
      "**/*.js",
      "**/*.jsx",
      "**/*.cjs",
      "**/*.mjs",
    ],
    // Override or add rules here
    rules: {},
  },
  // Must stay last — disables ESLint stylistic rules that would conflict
  // with Prettier's formatting decisions.
  prettierConfig,
];
