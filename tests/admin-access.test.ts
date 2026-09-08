import { describe, expect, it } from "vitest";
import { membershipHasAdminAccess } from "@/lib/admin-access";

const membership = (slug: string, status = "ACTIVE") => ({
  status,
  roles: [{ role: { slug } }],
});
const configuredEmail =
  process.env.ADMIN_EMAIL || process.env.LOCAL_ADMIN_EMAIL || "admin@tripleminds.co";

describe("admin access policy", () => {
  it("allows the dedicated admin role", () => {
    expect(membershipHasAdminAccess(membership("admin"), configuredEmail)).toBe(true);
  });

  it("allows the local administrator only in development", () => {
    expect(membershipHasAdminAccess(membership("local-admin"), configuredEmail)).toBe(true);
  });

  it("does not treat a normal HR administrator role as the system admin", () => {
    expect(membershipHasAdminAccess(membership("hr-admin"), configuredEmail)).toBe(false);
  });

  it("rejects inactive memberships", () => {
    expect(membershipHasAdminAccess(membership("admin", "INACTIVE"), configuredEmail)).toBe(false);
  });
});
