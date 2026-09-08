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
  // A completed interview can be reviewed directly even when an older or
  // imported application is still in APPLIED. Keep SELECTED terminal and
  // require the normal review decision before hiring.
  APPLIED: ["SCREENING", "SHORTLISTED", "HOLD", "REJECTED"],
  SCREENING: ["SHORTLISTED", "HOLD", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "HOLD", "REJECTED"],
  INTERVIEW: ["SELECTED", "HOLD", "REJECTED"],
  SELECTED: [],
  HOLD: ["SCREENING", "SHORTLISTED", "REJECTED"],
  REJECTED: [],
};

export function canTransition(from: CandidateStatus, to: CandidateStatus) {
  return STATUS_TRANSITIONS[from].includes(to);
}
