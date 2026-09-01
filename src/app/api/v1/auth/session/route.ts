import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { errorResponse, unauthenticatedError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return errorResponse(unauthenticatedError(), id);
    return successResponse({ user: session.user, session: session.session }, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
