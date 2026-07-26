import nx from "@nx/eslint-plugin";
import sonarjs from "eslint-plugin-sonarjs";
import security from "eslint-plugin-security";
import importX from "eslint-plugin-import-x";
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
