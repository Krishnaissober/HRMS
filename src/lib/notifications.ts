import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type Notification = { recipient: string; subject: string; body: string; template?: string; variables?: Record<string, string> };
export interface EmailProvider { send(notification: Notification): Promise<{ providerMessageId?: string }>; }

class ConsoleEmailProvider implements EmailProvider {
  async send(notification: Notification) {
    logger.info({ recipient: notification.recipient, subject: notification.subject, template: notification.template }, "email_queued");
    return {};
  }
}

export function emailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === "console") return new ConsoleEmailProvider();
  throw new Error("The configured email provider adapter is not installed");
}

export interface InAppNotificationStore { create(notification: Notification & { userId: string; organizationId: string }): Promise<void>; }
