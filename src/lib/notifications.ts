// Compatibility exports for existing modules. New email integrations should
// import from email-service.ts directly.
export {
  emailProvider,
  type EmailProvider,
  type InAppNotificationStore,
  type Notification,
} from "@/lib/email-service";
