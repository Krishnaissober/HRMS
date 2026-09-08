export const HIRING_DECISIONS = ["HIRE", "HOLD", "REJECT"] as const;
export type HiringDecisionType = (typeof HIRING_DECISIONS)[number];

export const HIRING_DECISION_TRANSITIONS: Record<string, readonly HiringDecisionType[]> = {
  APPLIED: [],
  SCREENING: [],
  // A completed review can shortlist a candidate; the next decision is then Hire, Hold, or Reject.
  SHORTLISTED: HIRING_DECISIONS,
  INTERVIEW: HIRING_DECISIONS,
  SELECTED: [],
  HOLD: ["REJECT"],
  REJECTED: [],
};

export function canRecordHiringDecision(
  currentCandidateStatus: string,
  decision: HiringDecisionType,
) {
  return HIRING_DECISION_TRANSITIONS[currentCandidateStatus]?.includes(decision) ?? false;
}

export const OFFER_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "WITHDRAWN",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const HIRING_PERMISSIONS = {
  decisionsRead: "hiring-decisions.read",
  decisionsWrite: "hiring-decisions.write",
  offersRead: "offers.read",
  offersCreate: "offers.create",
  offersApprove: "offers.approve",
  offersSend: "offers.send",
} as const;
