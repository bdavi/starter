//@ts-check

// A dedicated, dependency-free entry point (ADR-00020) — next.config.js
// runs under plain Node before any bundler exists, so it can't `require()`
// "@starter/observability/node" itself (that has its own relative imports,
// which plain Node's module resolution can't follow without a bundler).
// Verified empirically against this repo's Node version.
const {
  OBSERVABILITY_EXTERNAL_PACKAGES,
} = require("@starter/observability/external-packages");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal workspace packages are consumed as TS source, not pre-built
  // dist output — Next's bundler needs to be told to actually transform
  // them (module resolution of their nodenext-style ".js"-extension
  // imports otherwise fails, since there's no real .js file on disk).
  transpilePackages: [
    "@starter/config",
    "@starter/db",
    "@starter/auth",
    "@starter/observability",
  ],
  // Auto-instrumentation and Pino's transport mechanism both do dynamic
  // require() calls the bundler can't statically analyze — same shape of
  // problem transpilePackages solves for workspace packages, opposite
  // fix (exclude from bundling rather than force transformation).
  serverExternalPackages: [...OBSERVABILITY_EXTERNAL_PACKAGES],
};

module.exports = nextConfig;
