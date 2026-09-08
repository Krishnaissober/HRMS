import { db } from "@/lib/db";
import { emailProvider } from "@/lib/notifications";

export async function sendInterviewNotification(notificationId: string) {
  const notification = await db.interviewNotification.findUnique({
    where: { id: notificationId },
    include: { interview: { include: { candidate: true } } },
  });
  if (!notification) return null;
  await emailProvider().send({
    recipient: notification.recipient,
    subject: `Interview ${notification.interview.referenceNo}`,
    body: `Interview scheduled for ${notification.interview.scheduledStart.toISOString()}`,
    template: notification.type,
  });
  return db.interviewNotification.update({
    where: { id: notification.id },
    data: { status: "SENT", sentAt: new Date() },
  });
}
