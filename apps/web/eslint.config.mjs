import nextEslintPluginNext from "@next/eslint-plugin-next";
import nx from "@nx/eslint-plugin";
import baseConfig from "../../eslint.config.mjs";

export default [
  // Previously just registered the plugin without applying its rules —
  // looked configured, did nothing. core-web-vitals is the config Next.js
  // itself recommends (recommended + Core Web Vitals-specific rules).
  nextEslintPluginNext.configs["core-web-vitals"],
  ...nx.configs["flat/react-typescript"],
  ...baseConfig,
  {
    ignores: [".next/**/*", "**/out-tsc"],
  },
];
