import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { EMPLOYEE_PERMISSIONS } from "@/modules/employees/constants";
import { documentUploadRequestSchema } from "@/modules/employees/schemas";
import { createSelfServiceDocumentUploadUrl } from "@/modules/employees/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      EMPLOYEE_PERMISSIONS.selfUpdate,
    );
    const parsed = parseBody(documentUploadRequestSchema, await request.json());
    return successResponse(
      await createSelfServiceDocumentUploadUrl({
        organizationId: context.organizationId,
        userEmail: context.session.user.email,
        id: (await params).documentId,
        ...parsed,
      }),
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
