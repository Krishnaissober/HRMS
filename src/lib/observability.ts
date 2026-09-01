import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export function initializeObservability() {
  if (env.SENTRY_DSN) logger.info("sentry_configured");
  if (env.OTEL_EXPORTER_OTLP_ENDPOINT) logger.info("otel_configured");
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  logger.error({ error, ...context }, "unhandled_exception");
}
