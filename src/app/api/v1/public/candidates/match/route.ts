import { NextRequest } from "next/server";
import { errorResponse, notFoundError, validationError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { findCandidateMatch, findOrganizationBySlug } from "@/modules/candidates/repository";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const organizationSlug = request.nextUrl.searchParams.get("organizationSlug")?.trim();
    const identifier = request.nextUrl.searchParams.get("identifier")?.trim();
    if (!organizationSlug || !identifier) throw validationError("Organization and email/mobile are required.");
    const organization = await findOrganizationBySlug(organizationSlug);
    if (!organization) throw notFoundError();
    const candidate = await findCandidateMatch(organization.id, identifier);
    if (!candidate) throw notFoundError();
    const requisitionId = request.nextUrl.searchParams.get("requisitionId")?.trim();
    const source = request.nextUrl.searchParams.get("source") === "WALK_IN" ? "WALK_IN" : "ONLINE";
    const previousSubmission = requisitionId ? await db.candidateSubmission.findFirst({ where: { candidateId: candidate.id, source, application: { is: { requisitionId } } }, select: { id: true } }) : null;
    return successResponse({ ...candidate, duplicateSubmission: Boolean(previousSubmission) }, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
