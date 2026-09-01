import { db } from "@/lib/db";

export async function checkDatabase() {
  await db.$queryRaw`SELECT 1`;
  return "ok" as const;
}
