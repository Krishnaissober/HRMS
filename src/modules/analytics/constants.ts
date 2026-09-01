import type { AnalyticsDomain } from "@/modules/analytics/schemas";

export const REPORT_EXPORT_PERMISSION = "reports.export";

export const ANALYTICS_PERMISSIONS: Record<AnalyticsDomain, readonly string[]> = {
  recruitment: ["dashboard.recruitment.read", "candidates.read", "interviews.read", "offers.read"],
  workforce: ["employees.read"],
  attendance: ["attendance.read", "candidate-attendance.read"],
  leave: ["leave.read"],
  hr: ["dashboard.hr.read", "onboarding.read", "employees.documents.read", "tasks.read"],
  payroll: ["payroll.reports"],
  audit: ["audit.read"],
};
