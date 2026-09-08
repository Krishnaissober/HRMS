import { describe, expect, it } from "vitest";
import {
  attendanceCheckInSchema,
  attendanceCheckOutSchema,
  attendanceExceptionSchema,
  visitorCreateSchema,
} from "@/modules/attendance/schemas";

describe("candidate attendance validation", () => {
  it("requires a visit, candidate or interview for check-in", () => {
    expect(attendanceCheckInSchema.parse({ candidateId: "candidate-1" }).candidateId).toBe(
      "candidate-1",
    );
    expect(() => attendanceCheckInSchema.parse({ purpose: "Interview" })).toThrow();
  });

  it("requires a checked-out visit identifier and exception notes", () => {
    expect(attendanceCheckOutSchema.parse({ visitId: "visit-1" }).visitId).toBe("visit-1");
    expect(() =>
      attendanceExceptionSchema.parse({ exceptionType: "LATE_ARRIVAL", notes: "" }),
    ).toThrow();
  });

  it("validates visitor context and host fields", () => {
    const result = visitorCreateSchema.parse({
      candidateId: "candidate-1",
      hostUserId: "host-1",
      visitDate: "2026-08-25T10:00:00.000Z",
      purpose: "Interview visit",
    });
    expect(result.hostUserId).toBe("host-1");
  });
});
