import { randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-access";
import { env } from "@/lib/env";
import { errorResponse, notFoundError, validationError } from "@/lib/errors";
import { emailProvider } from "@/lib/email-service";
import { requestId, successResponse } from "@/lib/request";

const emailTestSchema = z.object({
  recipient: z.string().email(),
});

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (env.NODE_ENV === "production") throw notFoundError();
    await getAdminContext(request);

    const parsed = emailTestSchema.safeParse(await request.json());
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const testCode = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await emailProvider().send({
      recipient: parsed.data.recipient,
      subject: "Triple Minds HR email delivery test",
      body: `Triple Minds HR email delivery test\n\nYour development test code is: ${testCode}\n\nThis is not a password-reset code and does not grant access to any account.`,
      htmlBody: `<div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dce4f0;border-radius:16px;padding:32px"><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#3158d4">TRIPLE MINDS HR</div><h1 style="margin:24px 0 12px;font-size:24px">Email delivery test</h1><p style="font-size:15px;line-height:1.6">This message confirms that the configured development email provider can deliver mail.</p><div style="margin:24px 0;padding:18px;text-align:center;border-radius:12px;background:#eef3ff;color:#1d3fa8;font-size:32px;font-weight:700;letter-spacing:8px">${testCode}</div><p style="font-size:13px;line-height:1.6;color:#68758a">This is not a password-reset code and does not grant access to any account.</p></div></div>`,
      template: "development-email-test",
      variables: { otp: testCode },
    });

    return successResponse({ sent: true }, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
