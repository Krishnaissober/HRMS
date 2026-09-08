export const INTERVIEW_STATUSES = [
  "SCHEDULED",
  "CHECKED_IN",
  "COMPLETED",
  "NO_SHOW",
  "RESCHEDULED",
  "CANCELLED",
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_PERMISSIONS = {
  read: "interviews.read",
  create: "interviews.create",
  update: "interviews.update",
  evaluate: "interviews.evaluate",
  attendance: "interviews.attendance",
  schedule: "interviews.schedule",
} as const;

export const INTERVIEW_STATUS_TRANSITIONS: Record<InterviewStatus, readonly InterviewStatus[]> = {
  SCHEDULED: ["CHECKED_IN", "NO_SHOW", "RESCHEDULED", "CANCELLED"],
  CHECKED_IN: ["COMPLETED"],
  COMPLETED: [],
  NO_SHOW: [],
  RESCHEDULED: ["CHECKED_IN", "NO_SHOW", "CANCELLED"],
  CANCELLED: [],
};

export function canTransitionInterview(from: InterviewStatus, to: InterviewStatus) {
  return INTERVIEW_STATUS_TRANSITIONS[from].includes(to);
}
