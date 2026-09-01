import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbiddenError } from "@/lib/errors";
import { assertTenantMatch } from "@/lib/tenant-policy";
import { membershipHasPermission } from "@/lib/rbac";

vi.mock("@/lib/db", () => ({ db: { membership: { findUnique: vi.fn() } } }));

describe("tenant isolation", () => {
  it("rejects records owned by another organization", () => {
    expect(() => assertTenantMatch("org-a", "org-b")).toThrowError(forbiddenError());
  });

  it("accepts records owned by the current organization", () => {
    expect(assertTenantMatch("org-a", "org-a")).toBe(true);
  });
});

describe("RBAC", () => {
  const membership = { status: "ACTIVE", roles: [{ role: { permissions: [{ permission: { name: "roles.manage" } }] } }] };

  beforeEach(() => vi.clearAllMocks());

  it("allows a declared permission", () => {
    expect(membershipHasPermission(membership, "roles.manage")).toBe(true);
  });

  it("denies undeclared permissions and inactive memberships", () => {
    expect(membershipHasPermission(membership, "members.manage")).toBe(false);
    expect(membershipHasPermission({ ...membership, status: "INACTIVE" }, "roles.manage")).toBe(false);
  });
});
