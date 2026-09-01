import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { viewOffer } from "@/modules/hiring/service";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try { const token = request.nextUrl.searchParams.get("token") || ""; return successResponse(await viewOffer({ token, requestId: id }), id); } catch (error) { return errorResponse(error, id); }
}
