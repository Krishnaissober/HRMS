import { getInterview, createInterview as createInterviewRecord, updateInterview as updateInterviewRecord, updateInterviewAttendance, submitEvaluation, createInterviewTemplate, createInterviewAvailability } from "@/modules/interviews/repository";
import { canTransitionInterview, type InterviewStatus } from "@/modules/interviews/constants";
import { notFoundError, validationError } from "@/lib/errors";

export async function createInterview(input: Parameters<typeof createInterviewRecord>[0]) {
  if (new Date(input.scheduledEnd) <= new Date(input.scheduledStart)) throw validationError({ scheduledEnd: ["Interview end must be after interview start"] });
  return createInterviewRecord(input);
}

export async function updateInterview(input: Parameters<typeof updateInterviewRecord>[0]) {
  const current = await getInterview(input.organizationId, input.id);
  if (!current) throw notFoundError();
  const isReschedule = input.patch.status === "RESCHEDULED" && Boolean(input.patch.scheduledStart || input.patch.scheduledEnd);
  if (isReschedule && current.activities.filter((activity) => activity.action === "INTERVIEW_RESCHEDULED").length > 0 && !input.patch.rescheduleReason?.trim()) throw validationError({ rescheduleReason: ["A reason is required after the first reschedule"] });
  if (input.patch.status && input.patch.status !== current.status && !canTransitionInterview(current.status as InterviewStatus, input.patch.status)) throw validationError({ status: [`Invalid transition from ${current.status} to ${input.patch.status}`] });
  if (input.patch.mode === "VIDEO" && !input.patch.meetingLink?.trim()) throw validationError({ meetingLink: ["A meeting link is required for video interviews"] });
  if (input.patch.status === "NO_SHOW" && !input.patch.noShowReason?.trim()) throw validationError({ noShowReason: ["A reason is required when marking an interview as no-show"] });
  if (input.patch.scheduledStart && input.patch.scheduledEnd && new Date(input.patch.scheduledEnd) <= new Date(input.patch.scheduledStart)) throw validationError({ scheduledEnd: ["Interview end must be after interview start"] });
  return updateInterviewRecord(input);
}

export async function checkInInterview(input: Parameters<typeof updateInterviewAttendance>[0]) {
  const result = await updateInterviewAttendance({ ...input, direction: "CHECK_IN" });
  if (!result) throw notFoundError();
  return result;
}

export async function checkOutInterview(input: Parameters<typeof updateInterviewAttendance>[0]) {
  const result = await updateInterviewAttendance({ ...input, direction: "CHECK_OUT" });
  if (!result) throw notFoundError();
  return result;
}

export async function submitInterviewEvaluation(input: Parameters<typeof submitEvaluation>[0]) {
  return submitEvaluation(input);
}

export async function createTemplate(input: Parameters<typeof createInterviewTemplate>[0]) {
  return createInterviewTemplate(input);
}

export async function createAvailability(input: Parameters<typeof createInterviewAvailability>[0]) {
  if (new Date(input.endsAt) <= new Date(input.startsAt)) throw validationError({ endsAt: ["Availability end must be after start"] });
  return createInterviewAvailability(input);
}
