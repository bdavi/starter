// Next.js's own entry point, run once before any other application code
// (https://nextjs.org/docs/app/guides/instrumentation) — the one place
// packages/observability's setup() is called from (ADR-00020). Runs in
// both the Node.js and Edge runtimes; only the former can load the real
// SDK (Edge lacks most of what it needs), hence the runtime check below.
export async function register(): Promise<void> {
  // process.env.NEXT_RUNTIME is Next's own runtime discriminator, injected
  // by its build system — not app config, so it's exempt from the
  // createEnvGetter convention (see eslint.config.mjs's n/no-process-env
  // exemption for this file).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setup } = await import("@starter/observability/node");
    const { getWebEnv } = await import("./env");
    const env = getWebEnv();
    setup({
      serviceName: "web",
      otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      sentryDsn: env.SENTRY_DSN,
    });
  }
}
