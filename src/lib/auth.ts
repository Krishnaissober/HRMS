import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { emailProvider } from "@/lib/notifications";

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
