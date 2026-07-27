//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Internal workspace packages are consumed as TS source, not pre-built
  // dist output — Next's bundler needs to be told to actually transform
  // them (module resolution of their nodenext-style ".js"-extension
  // imports otherwise fails, since there's no real .js file on disk).
  transpilePackages: ["@starter/config", "@starter/db", "@starter/auth"],
};

module.exports = nextConfig;
