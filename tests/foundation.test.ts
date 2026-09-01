import { describe, expect, it } from "vitest";
import { FOUNDATION_PERMISSIONS } from "@/lib/rbac-permissions";
import { env } from "@/lib/env";
import { AppError, validationError } from "@/lib/errors";

describe("Phase 0 foundation", () => {
  it("loads validated environment configuration", () => {
    expect(env.APP_URL).toMatch(/^https?:\/\//);
    expect(env.BETTER_AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it("defines only foundation permissions", () => {
    expect(FOUNDATION_PERMISSIONS).toContain("roles.manage");
    expect(FOUNDATION_PERMISSIONS).toContain("candidates.read");
  });

  it("maps validation errors without leaking internals", () => {
    const error = validationError({ field: "email" });
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(422);
    expect(error.code).toBe("VALIDATION_ERROR");
  });
});
