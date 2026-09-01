export const DASHBOARD_PERMISSIONS = {
  hrRead: "dashboard.hr.read",
  recruitmentRead: "dashboard.recruitment.read",
} as const;

export const RECRUITMENT_DRILLDOWN_PERMISSIONS = [
  "candidates.read",
  "interviews.read",
  "offers.read",
] as const;

export const HR_ACTION_CENTER_PERMISSIONS = [
  "notifications.read",
  "tasks.read",
] as const;
