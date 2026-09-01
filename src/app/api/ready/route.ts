import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { AppError, errorResponse } from "@/lib/errors";
import { checkRedis } from "@/lib/queue";
import { requestId, successResponse } from "@/lib/request";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  const [databaseResult, redisResult] = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    checkRedis(),
  ]);
  const dependencies = {
    database: databaseResult.status === "fulfilled" ? "ok" : "unavailable",
    redis: redisResult.status === "fulfilled" ? "ok" : "unavailable",
  } as const;
  if (Object.values(dependencies).some((value) => value !== "ok")) {
    return errorResponse(new AppError("INTERNAL_ERROR", "The application is not ready", 503, { dependencies }), id);
  }
  return successResponse({ status: "ready", dependencies }, id);
}
