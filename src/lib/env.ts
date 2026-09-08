import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  BETTER_AUTH_SECRET: z.string().min(32).default("development-only-secret-change-me-123456"),
  PII_ENCRYPTION_KEY: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("hr-portal-private"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().email().default("no-reply@example.test"),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ADMIN_EMAIL: z.string().email().default("admin@tripleminds.co"),
  ADMIN_ROLE_SLUG: z.string().trim().min(1).default("admin"),
  LOCAL_ADMIN_EMAIL: z.string().email().optional(),
  LOCAL_ADMIN_ORGANIZATION_SLUG: z.string().default("triple-minds"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

if (
  parsed.data.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  parsed.data.BETTER_AUTH_SECRET.includes("development-only")
) {
  throw new Error("BETTER_AUTH_SECRET must be replaced in production");
}

export const env = parsed.data;
