import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "sqlite" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: async (request) => {
    const origins = [env.APP_URL, env.BETTER_AUTH_URL];
    if (env.NODE_ENV !== "production" && request) origins.push(new URL(request.url).origin);
    return origins;
  },
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  advanced: { useSecureCookies: env.NODE_ENV === "production" },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
});

export type AuthSession = typeof auth.$Infer.Session;
