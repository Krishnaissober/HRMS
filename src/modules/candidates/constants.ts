export const CANDIDATE_SOURCES = ["ONLINE", "WALK_IN"] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

export const CANDIDATE_STATUSES = [
  "APPLIED",
  "SCREENING",
  "SHORTLISTED",
  "INTERVIEW",
  "SELECTED",
  "HOLD",
  "REJECTED",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const HIRING_APPROVAL_STATUSES = [
  "NOT_REQUESTED",
  "AWAITING_MASTER_REVIEW",
  "MASTER_APPROVED",
  "MASTER_REJECTED",
  "FINAL_HIRED",
  "FINAL_REJECTED",
] as const;
export type HiringApprovalStatus = (typeof HIRING_APPROVAL_STATUSES)[number];

export const CANDIDATE_REMOVAL_ACTIONS = [
  "CANDIDATE_REMOVED",
  "SELECTED_CANDIDATE_REMOVED",
] as const;

export function assessInterviewRatings(communication: string, technical: string) {
  if (![communication, technical].every((rating) => /^[1-5]$/.test(rating))) return null;
  const score = (Number(communication) + Number(technical)) / 2;
  return {
    overallFit: String(score),
    recommendation: score >= 4 ? "SHORTLISTED" : score >= 3 ? "HOLD" : "REJECTED",
  };
}

export const CANDIDATE_PERMISSIONS = {
  read: "candidates.read",
  create: "candidates.create",
  update: "candidates.update",
  statusUpdate: "candidates.status.update",
  documentsRead: "candidates.documents.read",
  documentsWrite: "candidates.documents.write",
} as const;

export const STATUS_TRANSITIONS: Record<CandidateStatus, readonly CandidateStatus[]> = {
  // Candidates are shortlisted only after the interview workflow is complete.
  // Existing SHORTLISTED records remain supported for backwards compatibility.
  APPLIED: ["SCREENING", "INTERVIEW", "HOLD", "REJECTED"],
  SCREENING: ["INTERVIEW", "HOLD", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "HOLD", "REJECTED"],
  INTERVIEW: ["SHORTLISTED", "HOLD", "REJECTED"],
  SELECTED: [],
  HOLD: ["SCREENING", "INTERVIEW", "REJECTED"],
  REJECTED: [],
};

export function canTransition(from: CandidateStatus, to: CandidateStatus) {
  return STATUS_TRANSITIONS[from].includes(to);
}
