import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { emailProvider } from "@/lib/email-service";
import { databaseProvider } from "@/lib/database-provider";
import { redisConnection } from "@/lib/redis";
import { logger } from "@/lib/logger";

const googleOAuthEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

const productionRateLimitStorage =
  env.NODE_ENV === "production"
    ? {
        async get(key: string) {
          const value = await redisConnection.get(`better-auth:rate-limit:${key}`);
          return value ? JSON.parse(value) : null;
        },
        async set(key: string, value: unknown, _update?: boolean) {
          void _update;
          await redisConnection.set(
            `better-auth:rate-limit:${key}`,
            JSON.stringify(value),
            "EX",
            60,
          );
        },
        async consume(key: string, rule: { window: number; max: number }) {
          const redisKey = `better-auth:rate-limit:${key}`;
          const count = await redisConnection.incr(redisKey);
          if (count === 1) await redisConnection.expire(redisKey, rule.window);
          if (count <= rule.max) return { allowed: true, retryAfter: null };
          const ttl = await redisConnection.ttl(redisKey);
          return { allowed: false, retryAfter: ttl > 0 ? ttl : rule.window };
        },
      }
    : undefined;

function isGoogleCallback(
  context: { path?: string; params?: Record<string, string | undefined> } | null,
) {
  return context?.path === "/callback/:id" && context.params?.id === "google";
}

async function hasAuthorizedGoogleMembership(userId: string) {
  const [user, memberships] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { email: true } }),
    db.membership.findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        roles: {
          select: {
            role: {
              select: {
                slug: true,
                permissions: { select: { permission: { select: { name: true } } } },
              },
            },
          },
        },
      },
    }),
  ]);
  if (!user) return false;
  const normalizedEmail = user.email.trim().toLowerCase();
  const configuredAdminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredLocalAdminEmail = env.LOCAL_ADMIN_EMAIL?.trim().toLowerCase();
  const hrPermissions = new Set([
    "dashboard.hr.read",
    "dashboard.recruitment.read",
    "candidates.read",
    "interviews.read",
  ]);

  return memberships.some((membership) =>
    membership.roles.some(({ role }) => {
      const isMasterAdmin =
        role.slug === env.ADMIN_ROLE_SLUG && normalizedEmail === configuredAdminEmail;
      const isLocalAdmin =
        env.NODE_ENV !== "production" &&
        role.slug === "local-admin" &&
        normalizedEmail === configuredLocalAdminEmail;
      const isHrUser = role.permissions.some(({ permission }) =>
        hrPermissions.has(permission.name),
      );
      return isMasterAdmin || isLocalAdmin || isHrUser;
    }),
  );
}

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
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
  },
  socialProviders: googleOAuthEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          // Google is an authentication method for provisioned HR accounts,
          // never a self-service path to create a privileged account.
          disableSignUp: true,
        },
      }
    : undefined,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: true,
    },
  },
  plugins: [
    bearer(),
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
        const body = `Triple Minds HR\n\nYour one-time code is: ${otp}\n\nThis code expires in 5 minutes and can only be used once. Never share this code with anyone. If you did not request this email, you can safely ignore it.`;
        const htmlBody = `<div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dce4f0;border-radius:16px;padding:32px"><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#3158d4">TRIPLE MINDS HR</div><h1 style="margin:24px 0 12px;font-size:24px;color:#172033">Your verification code</h1><p style="font-size:15px;line-height:1.6">Use the one-time code below to continue with your ${type === "forget-password" ? "password reset" : "account verification"}.</p><div style="margin:24px 0;padding:18px;text-align:center;border-radius:12px;background:#eef3ff;color:#1d3fa8;font-size:32px;font-weight:700;letter-spacing:8px">${otp}</div><p style="font-size:14px;line-height:1.6;color:#52627a">This code expires in 5 minutes and can only be used once. Never share it with anyone.</p><p style="font-size:13px;line-height:1.6;color:#68758a">If you did not request this email, you can safely ignore it.</p></div></div>`;
        try {
          await emailProvider().send({
            recipient: email,
            subject,
            body,
            htmlBody,
            template: "auth-otp",
            variables: { otp, type },
          });
        } catch (error) {
          // Keep Better Auth's password-reset response generic even when a
          // configured mail provider is temporarily unavailable.
          logger.error(
            {
              type,
              provider: env.EMAIL_PROVIDER,
              error: error instanceof Error ? error.message : "Unknown email delivery error",
            },
            "auth_otp_delivery_failed",
          );
        }
      },
    }),
  ],
  // Local production runs on http://localhost. Secure cookies are only
  // accepted by browsers over HTTPS, so enabling them solely from NODE_ENV
  // silently drops the session cookie and makes the HR dashboard look offline.
  advanced: {
    useSecureCookies: env.NODE_ENV === "production" && env.BETTER_AUTH_URL.startsWith("https://"),
  },
  databaseHooks: {
    user: {
      create: {
        async before(_user, context) {
          // Keep this boundary server-side even if a future provider setting
          // accidentally permits implicit Google sign-up.
          if (isGoogleCallback(context)) return false;
        },
      },
    },
    session: {
      create: {
        async before(session, context) {
          if (!isGoogleCallback(context)) return;
          // A Google session is only valid for an already-provisioned HR
          // account with an active organization membership.
          if (!(await hasAuthorizedGoogleMembership(session.userId))) return false;
        },
      },
    },
  },
  // The dedicated E2E server exercises real auth and authorization flows. Its
  // isolated process must not share the production login throttle with other
  // test cases running from the same loopback address.
  rateLimit: {
    enabled: process.env.E2E_TEST_MODE !== "1",
    customStorage: productionRateLimitStorage,
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
});

export type AuthSession = typeof auth.$Infer.Session;
export { googleOAuthEnabled };
