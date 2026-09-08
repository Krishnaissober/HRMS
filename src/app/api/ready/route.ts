import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { AppError, errorResponse } from "@/lib/errors";
import { checkRedis } from "@/lib/redis";
import { checkStorage } from "@/lib/storage";
import { requestId, successResponse } from "@/lib/request";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  const [databaseResult, redisResult, storageResult] = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    checkRedis(),
    checkStorage(),
  ]);
  const dependencies = {
    database: databaseResult.status === "fulfilled" ? "ok" : "unavailable",
    redis: redisResult.status === "fulfilled" ? "ok" : "unavailable",
    storage: storageResult.status === "fulfilled" ? "ok" : "unavailable",
  } as const;
  if (Object.values(dependencies).some((value) => value !== "ok")) {
    return errorResponse(
      new AppError("INTERNAL_ERROR", "The application is not ready", 503, { dependencies }),
      id,
    );
  }
  return successResponse({ status: "ready", dependencies }, id);
}
