import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { getCandidateDocumentUrl } from "@/modules/candidates/service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(context.session.user.id, context.organizationId, CANDIDATE_PERMISSIONS.documentsRead);
    const values = await params;
    const result = await getCandidateDocumentUrl({ organizationId: context.organizationId, actorUserId: context.session.user.id, candidateId: values.id, documentId: values.documentId, requestId: id, download: request.nextUrl.searchParams.get("download") === "1" });
    if (request.nextUrl.searchParams.get("response") === "json") return successResponse({ downloadUrl: result.url }, id);
    return NextResponse.redirect(result.url);
  } catch (error) {
    return errorResponse(error, id);
  }
}
