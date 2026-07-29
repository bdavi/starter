// Packages consuming apps need to add to Next.js's `serverExternalPackages`
// (next.config.js) — auto-instrumentation and Pino's transport mechanism
// both do dynamic `require()` calls bundlers can't statically analyze.
// This repo already hit the identical shape of problem for internal
// workspace packages (`transpilePackages`, see apps/web/AGENTS.md) —
// same fix here: the package that knows the list owns it, the app just
// plumbs it through, since next.config.js has to live in the app. See
// ADR-00020.
//
// Deliberately its own entry point ("./external-packages"), not re-exported
// from "./node" — next.config.js is executed directly by plain Node before
// any bundler exists, and empirically (verified against this repo's Node
// version) plain `require()` can load a single dependency-free TS file like
// this one, but not "./node", which has its own relative imports Node's
// native type-stripping can't resolve outside a bundler (no file extension,
// matching this repo's own no-.js-extension convention — see eslint.config.mjs).
//
// Usage in apps/web/next.config.js:
//   const { OBSERVABILITY_EXTERNAL_PACKAGES } = require("@starter/observability/external-packages");
//   module.exports = { serverExternalPackages: [...OBSERVABILITY_EXTERNAL_PACKAGES] };

export const OBSERVABILITY_EXTERNAL_PACKAGES = [
  "@opentelemetry/auto-instrumentations-node",
  "@opentelemetry/sdk-node",
  "@opentelemetry/instrumentation-pino",
  "@sentry/node",
  "pino",
  "pino-opentelemetry-transport",
] as const;
