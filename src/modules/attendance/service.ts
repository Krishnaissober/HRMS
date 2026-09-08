import { validationError } from "@/lib/errors";
import {
  checkInVisit,
  checkOutVisit,
  createVisit,
  getVisit,
  listVisits,
  recordException,
} from "@/modules/attendance/repository";

export { getVisit, listVisits };

export async function registerVisitor(input: Parameters<typeof createVisit>[0]) {
  if (new Date(input.visitDate).toString() === "Invalid Date")
    throw validationError({ visitDate: ["Visit date must be valid"] });
  return createVisit(input);
}

export async function checkInCandidate(input: Parameters<typeof checkInVisit>[0]) {
  return checkInVisit(input);
}
export async function checkOutCandidate(input: Parameters<typeof checkOutVisit>[0]) {
  return checkOutVisit(input);
}
export async function recordAttendanceException(input: Parameters<typeof recordException>[0]) {
  return recordException(input);
}
