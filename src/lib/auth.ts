import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { emailProvider } from "@/lib/notifications";
import { databaseProvider } from "@/lib/database-provider";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: databaseProvider(env.DATABASE_URL),
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: async (request) => {
    const origins = [env.APP_URL, env.BETTER_AUTH_URL];

    // Vercel assigns a deployment-specific hostname (for example
    // `hrms-<deployment>.vercel.app`). The fixed APP_URL/BETTER_AUTH_URL
    // values cannot cover that hostname, which makes Better Auth reject
    // otherwise valid sign-up/sign-in requests with "Invalid origin".
    for (const value of [
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ]) {
      if (value) origins.push(value.startsWith("http") ? value : `https://${value}`);
    }

    if (request) {
      const requestOrigin = new URL(request.url).origin;
      const requestHost = new URL(request.url).hostname;
      const isHrmsVercelHost =
        requestHost.endsWith(".vercel.app") && requestHost.startsWith("hrms-");
      if (env.NODE_ENV !== "production" || isHrmsVercelHost) origins.push(requestOrigin);
    }

    return [...new Set(origins)];
  },
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }) => {
        const subject =
          type === "forget-password"
            ? "Your Triple Minds password reset code"
            : "Your Triple Minds verification code";
        await emailProvider().send({
          recipient: email,
          subject,
          body: `Your one-time password is ${otp}. It expires in 5 minutes. If you did not request this, you can ignore this email.`,
          template: "auth-otp",
          variables: { otp, type },
        });
      },
    }),
  ],
  // Local production runs on http://localhost. Secure cookies are only
  // accepted by browsers over HTTPS, so enabling them solely from NODE_ENV
  // silently drops the session cookie and makes the HR dashboard look offline.
  advanced: {
    useSecureCookies: env.NODE_ENV === "production" && env.BETTER_AUTH_URL.startsWith("https://"),
  },
  // The dedicated E2E server exercises real auth and authorization flows. Its
  // isolated process must not share the production login throttle with other
  // test cases running from the same loopback address.
  rateLimit: { enabled: process.env.E2E_TEST_MODE !== "1" },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
});

export type AuthSession = typeof auth.$Infer.Session;
