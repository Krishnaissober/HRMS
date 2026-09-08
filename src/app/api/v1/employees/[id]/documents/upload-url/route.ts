import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { getEmployee } from "@/modules/employees/repository";
import { createUploadUrl } from "@/lib/storage";
import { z } from "zod";

const schema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.documentsWrite,
    );
    const employeeId = (await params).id;
    if (!(await getEmployee(context.organizationId, employeeId))) throw notFoundError();
    const parsed = parseBody(schema, await request.json());
    const objectKey = `employees/${context.organizationId}/${employeeId}/documents/${randomUUID()}-${parsed.fileName}`;
    return successResponse(
      { objectKey, uploadUrl: await createUploadUrl(objectKey, parsed.contentType), ...parsed },
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
