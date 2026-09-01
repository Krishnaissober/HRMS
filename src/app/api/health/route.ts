import { NextRequest } from "next/server";
import { requestId, successResponse } from "@/lib/request";

export async function GET(request: NextRequest) {
  return successResponse({ status: "ok", service: "hr-portal" }, requestId(request));
}
