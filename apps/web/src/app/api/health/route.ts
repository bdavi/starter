import { logger } from "@starter/observability";

// Real target for the Collector's filter/health_checks processor
// (services/otel-collector/config/collector.yaml) — replaces the
// placeholder match value now that a real health-check route exists
// (ADR-00018's Consequences).
export function GET(): Response {
  logger.debug({}, "health check");
  return Response.json({ status: "ok" });
}
