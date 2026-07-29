// The one place the real OpenTelemetry SDK gets instantiated — called
// exactly once, from an app's true entry point (apps/web's
// instrumentation.ts). Everywhere else in this package (and every
// consuming app/package) only ever touches the universal-safe facade in
// logger.ts/tags.ts, never this file directly except to call setup()
// itself. See ADR-00020's "API vs. SDK exposure" section for why this
// split exists.

import "server-only";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import * as Sentry from "@sentry/node";
import pino from "pino";
import { registerActiveLogger } from "./logger-registry";
import { createSentryRedactor } from "./sentry-redaction";
import { getObservabilityEnv } from "./env";

export interface SetupOptions {
  /** e.g. "web", "worker" — becomes the service.name resource attribute
   * the Sentry exporter (ADR-00017) routes on to pick a project. */
  serviceName: string;
  otlpEndpoint: string;
  sentryDsn?: string;
}

/**
 * Call exactly once, from an app's entry point, before any other
 * application code runs — auto-instrumentation needs to be registered
 * before the libraries it patches (e.g. pg, http) are first loaded
 * anywhere in the process (ADR-00020's "Auto-instrumentation" section).
 */
export function setup(options: SetupOptions): void {
  const env = getObservabilityEnv();
  const isProduction = env.NODE_ENV === "production";

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: options.serviceName,
  });

  // pino.transport() runs the target in a separate worker thread, so it
  // can't share the NodeSDK/resource objects constructed below — it needs
  // its own fully-serializable config, which is why loggerName/
  // resourceAttributes/exporter details are re-specified here rather than
  // reused from `resource`/`options` directly.
  const pinoLogger = pino({
    level: isProduction ? "info" : "debug",
    transport: isProduction
      ? {
          target: "pino-opentelemetry-transport",
          options: {
            loggerName: options.serviceName,
            resourceAttributes: { [ATTR_SERVICE_NAME]: options.serviceName },
            logRecordProcessorOptions: {
              recordProcessorType: "batch",
              exporterOptions: {
                protocol: "http",
                httpExporterOptions: {
                  url: `${options.otlpEndpoint}/v1/logs`,
                },
              },
            },
          },
        }
      : { target: "pino-pretty" },
  });
  registerActiveLogger(pinoLogger);

  if (options.sentryDsn) {
    Sentry.init({
      dsn: options.sentryDsn,
      // The Collector already routes traces to Sentry via its own
      // sentryexporter (ADR-00017/00018) — this SDK instance is only
      // for direct captureException() calls, not a second trace
      // pipeline. Verify this option name against the installed
      // @sentry/node version before relying on it; the Sentry <->
      // Collector trace-connectedness note in config/collector.yaml
      // is the thing this is meant to satisfy.
      skipOpenTelemetrySetup: true,
      beforeSend: (event) => {
        const redact = createSentryRedactor(env.OTEL_REDACTION_HMAC_KEY);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return redact(event as any) as any;
      },
    });

    process.on("uncaughtException", (error) => {
      Sentry.captureException(error);
    });
    process.on("unhandledRejection", (reason) => {
      Sentry.captureException(reason);
    });
  }

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: `${options.otlpEndpoint}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${options.otlpEndpoint}/v1/metrics`,
      }),
    }),
    contextManager: new AsyncLocalStorageContextManager(),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
}
