import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function validEnvironment() {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "file:./test.db");
  vi.stubEnv("REDIS_URL", "redis://localhost:6379");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");
  vi.stubEnv("PII_ENCRYPTION_KEY", "test-encryption-key-at-least-32-characters");
}

describe("deployment environment validation", () => {
  it("accepts blank optional settings and uses defaults", async () => {
    validEnvironment();
    for (const name of [
      "S3_ENDPOINT",
      "SENTRY_DSN",
      "OTEL_EXPORTER_OTLP_ENDPOINT",
      "LOCAL_ADMIN_EMAIL",
      "EMAIL_PROVIDER",
      "EMAIL_FROM",
      "LOG_LEVEL",
      "ADMIN_EMAIL",
      "ADMIN_ROLE_SLUG",
    ]) {
      vi.stubEnv(name, " ");
    }
    const { env } = await import("../src/lib/env");
    expect(env.S3_ENDPOINT).toBeUndefined();
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.EMAIL_PROVIDER).toBe("console");
  });
  it.each([
    "APP_URL",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "PII_ENCRYPTION_KEY",
    "BETTER_AUTH_URL",
    "REDIS_URL",
  ])("still rejects empty %s", async (name) => {
    validEnvironment();
    vi.stubEnv(name, "");
    await expect(import("../src/lib/env")).rejects.toThrow(name);
  });
  it("still rejects a nonempty invalid storage URL", async () => {
    validEnvironment();
    vi.stubEnv("S3_ENDPOINT", "not-a-url");
    await expect(import("../src/lib/env")).rejects.toThrow("S3_ENDPOINT");
  });
});
