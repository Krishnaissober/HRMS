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
  vi.stubEnv("MICROSOFT_TENANT_ID", "tenant-id");
  vi.stubEnv("MICROSOFT_CLIENT_ID", "client-id");
  vi.stubEnv("MICROSOFT_CLIENT_SECRET", "client-secret");
  vi.stubEnv("MICROSOFT_SENDER_EMAIL", "noreply@tripleminds.co");
}

describe("Microsoft Graph email delivery", () => {
  it("gets an app token and sends mail from the configured mailbox", async () => {
    validEnvironment();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "graph-token", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    const { sendMicrosoftGraphMail } = await import("../src/lib/microsoft-graph-mail");
    await sendMicrosoftGraphMail({
      recipient: "person@example.com",
      subject: "Test subject",
      body: "Test body",
      htmlBody: "<p>Test body</p>",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      "scope=https%3A%2F%2Fgraph.microsoft.com%2F.default",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://graph.microsoft.com/v1.0/users/noreply%40tripleminds.co/sendMail",
    );
    const request = fetchMock.mock.calls[1]?.[1];
    expect(request?.headers).toMatchObject({ Authorization: "Bearer graph-token" });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      message: {
        subject: "Test subject",
        body: { contentType: "HTML", content: "<p>Test body</p>" },
        toRecipients: [{ emailAddress: { address: "person@example.com" } }],
      },
      saveToSentItems: true,
    });
  });

  it("does not expose provider response bodies when Graph rejects mail", async () => {
    validEnvironment();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "graph-token", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("contains internal details", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    const { sendMicrosoftGraphMail } = await import("../src/lib/microsoft-graph-mail");
    await expect(
      sendMicrosoftGraphMail({
        recipient: "person@example.com",
        subject: "Test subject",
        body: "Test body",
      }),
    ).rejects.toThrow("Microsoft Graph sendMail failed with HTTP 403");
  });
});
