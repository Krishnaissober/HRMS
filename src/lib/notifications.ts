import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type Notification = {
  recipient: string;
  subject: string;
  body: string;
  template?: string;
  variables?: Record<string, string>;
};
export interface EmailProvider {
  send(notification: Notification): Promise<{ providerMessageId?: string }>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(notification: Notification) {
    logger.info(
      {
        recipient: notification.recipient,
        subject: notification.subject,
        template: notification.template,
      },
      "email_queued",
    );
    return {};
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(notification: Notification) {
    if (!env.RESEND_API_KEY)
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [notification.recipient],
        subject: notification.subject,
        text: notification.body,
      }),
    });
    if (!response.ok)
      throw new Error(`Email provider rejected the message with HTTP ${response.status}`);
    const result = (await response.json()) as { id?: string };
    return { providerMessageId: result.id };
  }
}

export function emailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === "console") return new ConsoleEmailProvider();
  if (env.EMAIL_PROVIDER === "resend") return new ResendEmailProvider();
  throw new Error("The configured email provider is not supported");
}

export interface InAppNotificationStore {
  create(notification: Notification & { userId: string; organizationId: string }): Promise<void>;
}
