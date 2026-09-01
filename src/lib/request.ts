import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";

export function requestId(request: NextRequest) {
  return request.headers.get("x-request-id") || randomUUID();
}

export function successResponse<T>(data: T, requestIdValue: string, init?: ResponseInit) {
  return Response.json({ success: true, data, requestId: requestIdValue }, init);
}
