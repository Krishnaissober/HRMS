import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendMicrosoftGraphMail } from "@/lib/microsoft-graph-mail";

export type Notification = {
  recipient: string;
  subject: string;
  body: string;
  htmlBody?: string;
  template?: string;
  variables?: Record<string, string>;
};

export interface EmailProvider {
  send(notification: Notification): Promise<{ providerMessageId?: string }>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(notification: Notification) {
    const developmentOtp =
      env.NODE_ENV !== "production" && env.EMAIL_DEV_LOG_OTP === "true"
        ? { otp: notification.variables?.otp }
        : {};
    logger.info(
      {
        recipient: notification.recipient,
        subject: notification.subject,
        template: notification.template,
        ...developmentOtp,
      },
      "email_queued",
    );
    return {};
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(notification: Notification) {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
    }

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
        ...(notification.htmlBody ? { html: notification.htmlBody } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend rejected the message with HTTP ${response.status}`);
    }

    const result = (await response.json()) as { id?: string };
    return { providerMessageId: result.id };
  }
}

class MicrosoftGraphEmailProvider implements EmailProvider {
  async send(notification: Notification) {
    return sendMicrosoftGraphMail(notification);
  }
}

export function emailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === "console") return new ConsoleEmailProvider();
  if (env.EMAIL_PROVIDER === "resend") return new ResendEmailProvider();
  if (["microsoft-graph", "graph"].includes(env.EMAIL_PROVIDER)) {
    return new MicrosoftGraphEmailProvider();
  }
  throw new Error("The configured email provider is not supported");
}

export interface InAppNotificationStore {
  create(notification: Notification & { userId: string; organizationId: string }): Promise<void>;
}
