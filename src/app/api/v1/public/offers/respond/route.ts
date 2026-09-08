import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { offerResponseSchema } from "@/modules/hiring/schemas";
import { respondToOffer } from "@/modules/hiring/service";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const parsed = parseBody(offerResponseSchema, await request.json());
    return successResponse(await respondToOffer({ ...parsed, requestId: id }), id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
