import IORedis from "ioredis";
import { env } from "@/lib/env";

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisConnection.on("error", () => {
  // Readiness and worker callers classify the connection failure; avoid an
  // unhandled emitter error when Redis is unavailable during startup.
});

export async function checkRedis() {
  if (redisConnection.status === "wait") await redisConnection.connect();
  await redisConnection.ping();
  return "ok" as const;
}
