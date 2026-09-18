import type { Notification } from "@/lib/email-service";
import { env } from "@/lib/env";

type CachedAccessToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedAccessToken: CachedAccessToken | undefined;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function getMicrosoftAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.accessToken;
  }

  if (!env.MICROSOFT_TENANT_ID || !env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft Graph OAuth settings are not configured");
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(env.MICROSOFT_TENANT_ID)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID,
        client_secret: env.MICROSOFT_CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Microsoft identity token request failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!result.access_token) throw new Error("Microsoft identity token response was invalid");

  const lifetimeSeconds = Math.max(60, (result.expires_in ?? 3600) - 60);
  cachedAccessToken = {
    accessToken: result.access_token,
    expiresAt: Date.now() + lifetimeSeconds * 1000,
  };
  return result.access_token;
}

export async function sendMicrosoftGraphMail(notification: Notification) {
  const senderEmail = env.MICROSOFT_SENDER_EMAIL ?? env.MICROSOFT_GRAPH_SENDER_EMAIL;
  if (!senderEmail) {
    throw new Error("MICROSOFT_SENDER_EMAIL is required for Microsoft Graph email delivery");
  }

  const accessToken = await getMicrosoftAccessToken();
  const html =
    notification.htmlBody ?? escapeHtml(notification.body).replaceAll("\n", "<br />");
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: notification.subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: notification.recipient } }],
        },
        saveToSentItems: true,
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 401) cachedAccessToken = undefined;
    throw new Error(`Microsoft Graph sendMail failed with HTTP ${response.status}`);
  }

  return {};
}
