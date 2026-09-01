import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";
const m = vi.hoisted(() => ({
  ctx: vi.fn(),
  perm: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  notes: vi.fn(),
  tasks: vi.fn(),
  mark: vi.fn(),
  setTask: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext: m.ctx }));
vi.mock("@/lib/rbac", () => ({
  requirePermission: m.perm,
  hasPermission: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/modules/documents-notifications/service", () => ({
  createManagedDocument: m.create,
  listDocuments: m.list,
  listNotifications: m.notes,
  listTasks: m.tasks,
  markNotification: m.mark,
  setTaskState: m.setTask,
}));
import { GET as documents, POST as createDocument } from "@/app/api/v1/documents/route";
import { GET as notifications } from "@/app/api/v1/notifications/route";
import { GET as tasks } from "@/app/api/v1/tasks/route";
const context = {
  organizationId: "org-a",
  session: { user: { id: "user-a", email: "hr@example.test" } },
};
const req = (path: string, method = "GET", body?: unknown) =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", "x-organization-id": "org-a" },
    body: body ? JSON.stringify(body) : undefined,
  });
describe("Phase 8 API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.ctx.mockResolvedValue(context);
    m.perm.mockResolvedValue(undefined);
    m.list.mockResolvedValue({ items: [], total: 0 });
    m.create.mockResolvedValue({ id: "doc-1" });
    m.notes.mockResolvedValue({ items: [], total: 0 });
    m.tasks.mockResolvedValue([]);
  });
  it("requires authentication and permissions", async () => {
    m.ctx.mockRejectedValueOnce(unauthenticatedError());
    expect((await documents(req("/api/v1/documents"))).status).toBe(401);
    m.ctx.mockResolvedValue(context);
    m.perm.mockRejectedValueOnce(forbiddenError());
    expect((await notifications(req("/api/v1/notifications"))).status).toBe(403);
  });
  it("validates document metadata", async () => {
    expect(
      (
        await createDocument(
          req("/api/v1/documents", "POST", {
            ownerType: "EMPLOYEE",
            ownerId: "e",
            documentType: "ID",
            title: "ID",
            objectKey: "x",
            fileName: "x.exe",
            contentType: "application/x-msdownload",
            byteSize: 1,
          }),
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await createDocument(
          req("/api/v1/documents", "POST", {
            ownerType: "EMPLOYEE",
            ownerId: "e",
            documentType: "ID",
            title: "ID",
            objectKey: "documents/org-a/employee/e/x.pdf",
            fileName: "x.pdf",
            contentType: "application/pdf",
            byteSize: 100,
          }),
        )
      ).status,
    ).toBe(201);
  });
  it("scopes notification and task reads to session user", async () => {
    expect((await notifications(req("/api/v1/notifications?unreadOnly=true"))).status).toBe(200);
    expect(m.notes).toHaveBeenCalledWith(
      "org-a",
      "user-a",
      expect.objectContaining({ unreadOnly: true }),
    );
    expect((await tasks(req("/api/v1/tasks"))).status).toBe(200);
    expect(m.tasks).toHaveBeenCalledWith("org-a", "user-a");
  });
});
