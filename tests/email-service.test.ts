import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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
  vi.stubEnv("EMAIL_PROVIDER", "resend");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("EMAIL_FROM", "noreply@tripleminds.co");
}

describe("provider-agnostic email service", () => {
  it("sends a notification through Resend without involving Better Auth", async () => {
    validEnvironment();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "resend-message-id" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { emailProvider } = await import("../src/lib/email-service");
    const result = await emailProvider().send({
      recipient: "person@gmail.com",
      subject: "Triple Minds HR test",
      body: "Plain text test",
      htmlBody: "<p>HTML test</p>",
    });

    expect(result).toEqual({ providerMessageId: "resend-message-id" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      from: "noreply@tripleminds.co",
      to: ["person@gmail.com"],
      html: "<p>HTML test</p>",
    });
  });
});
