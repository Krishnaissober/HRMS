import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody, parseQuery } from "@/lib/validate";
import { getAuthenticatedContext } from "@/lib/tenant";
import { hasPermission, requirePermission } from "@/lib/rbac";
import { PHASE8_PERMISSIONS } from "@/modules/documents-notifications/constants";
import {
  documentListSchema,
  documentUploadSchema,
} from "@/modules/documents-notifications/schemas";
import { createManagedDocument, listDocuments } from "@/modules/documents-notifications/service";
export async function GET(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(c.session.user.id, c.organizationId, PHASE8_PERMISSIONS.documentsRead);
    return successResponse(
      await listDocuments(
        c.organizationId,
        parseQuery(documentListSchema, r.nextUrl.searchParams),
        c.session.user.email,
        await hasPermission(
          c.session.user.id,
          c.organizationId,
          PHASE8_PERMISSIONS.documentsManage,
        ),
      ),
      id,
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
export async function POST(r: NextRequest) {
  const id = requestId(r);
  try {
    const c = await getAuthenticatedContext(r);
    await requirePermission(
      c.session.user.id,
      c.organizationId,
      PHASE8_PERMISSIONS.documentsManage,
    );
    return successResponse(
      await createManagedDocument({
        organizationId: c.organizationId,
        actorUserId: c.session.user.id,
        ...parseBody(documentUploadSchema, await r.json()),
        requestId: id,
      }),
      id,
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e, id);
  }
}
