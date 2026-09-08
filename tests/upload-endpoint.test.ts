import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

const { getAuthenticatedContext, requirePermission, createUploadUrl } = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermission: vi.fn(),
  createUploadUrl: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermission }));
vi.mock("@/lib/storage", () => ({ createUploadUrl }));

import { POST } from "@/app/api/v1/candidates/upload-url/route";

const context = { organizationId: "org-a", session: { user: { id: "user-a" } } } as never;
const validBody = {
  kind: "RESUME",
  fileName: "resume.pdf",
  contentType: "application/pdf",
  byteSize: 1024,
};

function request(body: unknown, organizationId = "org-a") {
  return new NextRequest("http://localhost/api/v1/candidates/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json", "x-organization-id": organizationId },
    body: JSON.stringify(body),
  });
}

describe("authenticated upload URL contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockResolvedValue(undefined);
    createUploadUrl.mockResolvedValue("https://storage.test/upload");
  });

  it("returns 401 for an unauthenticated request", async () => {
    getAuthenticatedContext.mockRejectedValue(unauthenticatedError());
    const response = await POST(request(validBody));
    expect(response.status).toBe(401);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user lacks permission", async () => {
    requirePermission.mockRejectedValue(forbiddenError());
    const response = await POST(request(validBody));
    expect(response.status).toBe(403);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("creates a tenant-owned upload URL without requiring a pre-existing object key", async () => {
    const response = await POST(request(validBody));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.data).toMatchObject({ uploadUrl: "https://storage.test/upload", expiresIn: 900 });
    expect(result.data.objectKey).toMatch(/^candidate-intake\/org-a\/.*-resume\.pdf$/);
    expect(createUploadUrl).toHaveBeenCalledWith(result.data.objectKey, "application/pdf");
  });

  it("rejects invalid type and oversized files before storage", async () => {
    const invalidType = await POST(
      request({ ...validBody, contentType: "application/x-msdownload" }),
    );
    const oversized = await POST(request({ ...validBody, byteSize: 10 * 1024 * 1024 + 1 }));
    expect(invalidType.status).toBe(422);
    expect(oversized.status).toBe(422);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("keeps a wrong tenant rejected by the authentication context", async () => {
    getAuthenticatedContext.mockRejectedValue(forbiddenError());
    const response = await POST(request(validBody, "org-b"));
    expect(response.status).toBe(403);
  });

  it("returns a safe 503 when storage cannot prepare an upload", async () => {
    createUploadUrl.mockRejectedValue(new Error("S3-compatible storage is not configured"));
    const response = await POST(request(validBody));
    const result = await response.json();
    expect(response.status).toBe(503);
    expect(result.error.message).toBe("Document storage is not configured");
    expect(result.error.message).not.toContain("S3-compatible");
  });
});
