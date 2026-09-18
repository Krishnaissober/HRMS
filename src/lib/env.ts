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
  EMAIL_PROVIDER: z.enum(["console", "resend", "microsoft-graph", "graph"]).default("console"),
  EMAIL_FROM: z.string().email().default("no-reply@example.test"),
  RESEND_API_KEY: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().trim().min(1).optional(),
  MICROSOFT_CLIENT_ID: z.string().trim().min(1).optional(),
  MICROSOFT_CLIENT_SECRET: z.string().trim().min(1).optional(),
  MICROSOFT_SENDER_EMAIL: z.string().email().optional(),
  // Backward-compatible name used by the first Graph implementation.
  MICROSOFT_GRAPH_SENDER_EMAIL: z.string().email().optional(),
  EMAIL_DEV_LOG_OTP: z.enum(["true", "false"]).default("false"),
  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ADMIN_EMAIL: z.string().email().default("admin@tripleminds.co"),
  ADMIN_ROLE_SLUG: z.string().trim().min(1).default("admin"),
  LOCAL_ADMIN_EMAIL: z.string().email().optional(),
  LOCAL_ADMIN_ORGANIZATION_SLUG: z.string().default("triple-minds"),
});

// Hosting dashboards often supply unused optional settings as empty strings.
// Zod defaults apply to undefined, so normalize only optional/defaulted settings.
// Connection URLs and encryption/auth secrets must still reject invalid values.
const optionalSettings = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
  "RESEND_API_KEY",
  "MICROSOFT_TENANT_ID",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "MICROSOFT_SENDER_EMAIL",
  "MICROSOFT_GRAPH_SENDER_EMAIL",
  "EMAIL_DEV_LOG_OTP",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SENTRY_DSN",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "LOG_LEVEL",
  "ADMIN_EMAIL",
  "ADMIN_ROLE_SLUG",
  "LOCAL_ADMIN_EMAIL",
  "LOCAL_ADMIN_ORGANIZATION_SLUG",
] as const;
const environment = { ...process.env };
// Vercel can store a variable reference such as `$NEON_POSTGRES_PRISMA_URL`
// as a literal value. Resolve references from the provider-injected environment
// without exposing or copying the underlying secret into source control.
for (const name of ["DATABASE_URL", "REDIS_URL"] as const) {
  const reference = environment[name]?.match(/^\$([A-Z0-9_]+)$/)?.[1];
  if (reference && environment[reference]) environment[name] = environment[reference];
}
for (const name of optionalSettings) {
  if (environment[name]?.trim() === "") environment[name] = undefined;
}
const parsed = envSchema.safeParse(environment);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(
    `Invalid environment configuration. Set these variables in the build/deployment environment:\n${issues.join("\n")}`,
  );
}

if (
  parsed.data.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  parsed.data.BETTER_AUTH_SECRET.includes("development-only")
) {
  throw new Error("BETTER_AUTH_SECRET must be replaced in production");
}

if (Boolean(parsed.data.GOOGLE_CLIENT_ID) !== Boolean(parsed.data.GOOGLE_CLIENT_SECRET)) {
  throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together");
}

const microsoftGraphSettings = [
  parsed.data.MICROSOFT_TENANT_ID,
  parsed.data.MICROSOFT_CLIENT_ID,
  parsed.data.MICROSOFT_CLIENT_SECRET,
  parsed.data.MICROSOFT_SENDER_EMAIL ?? parsed.data.MICROSOFT_GRAPH_SENDER_EMAIL,
];
const microsoftGraphSettingsConfigured = microsoftGraphSettings.every(Boolean);
const microsoftGraphSettingsPartial = microsoftGraphSettings.some(Boolean);
if (microsoftGraphSettingsPartial && !microsoftGraphSettingsConfigured) {
  throw new Error(
    "MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_SENDER_EMAIL must be configured together",
  );
}

if (
  parsed.data.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  process.env.E2E_TEST_MODE !== "1"
) {
  if (parsed.data.EMAIL_PROVIDER === "console") {
    throw new Error("EMAIL_PROVIDER must be set to a transactional provider in production");
  }
  if (parsed.data.EMAIL_PROVIDER === "resend" && !parsed.data.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend in production");
  }
  if (
    parsed.data.EMAIL_PROVIDER === "resend" &&
    parsed.data.EMAIL_FROM === "no-reply@example.test"
  ) {
    throw new Error(
      "EMAIL_FROM must be a verified sender address when EMAIL_PROVIDER=resend in production",
    );
  }
  if (["microsoft-graph", "graph"].includes(parsed.data.EMAIL_PROVIDER) && !microsoftGraphSettingsConfigured) {
    throw new Error(
      "Microsoft Graph settings are required when EMAIL_PROVIDER=graph in production",
    );
  }
}

if (["microsoft-graph", "graph"].includes(parsed.data.EMAIL_PROVIDER) && !microsoftGraphSettingsConfigured) {
  throw new Error(
    "Microsoft Graph settings are required when EMAIL_PROVIDER=graph",
  );
}

export const env = parsed.data;
