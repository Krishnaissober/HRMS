import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { errorResponse } from "@/lib/errors";
import { requestId } from "@/lib/request";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { HIRING_PERMISSIONS } from "@/modules/hiring/constants";
import { generateOfferPdf } from "@/modules/hiring/service";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      HIRING_PERMISSIONS.offersRead,
    );
    const offer = await generateOfferPdf(context.organizationId, (await params).id);
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let y = 790;
    const line = (label: string, value: unknown) => {
      page.drawText(`${label}: ${String(value ?? "Not provided")}`, {
        x: 48,
        y,
        size: 11,
        font,
        color: rgb(0.1, 0.13, 0.2),
      });
      y -= 22;
    };
    page.drawText("Employment Offer", {
      x: 48,
      y,
      size: 22,
      font: bold,
      color: rgb(0.06, 0.12, 0.25),
    });
    y -= 34;
    line("Candidate", `${offer.candidate.firstName} ${offer.candidate.lastName}`);
    line("Application", offer.application.referenceNo);
    line("Position", offer.application.requisition.title);
    line("Compensation", offer.compensationSummary);
    line("Proposed start", offer.proposedStartDate?.toISOString());
    line("Expiry", offer.expiryDate?.toISOString());
    y -= 10;
    page.drawText(offer.template.body.slice(0, 900), {
      x: 48,
      y,
      size: 10,
      font,
      maxWidth: 500,
      lineHeight: 15,
      color: rgb(0.1, 0.13, 0.2),
    });
    const bytes = await pdf.save();
    await db.$transaction((tx) =>
      writeAuditEvent(tx, {
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        action: "OFFER_DOWNLOADED",
        entityType: "Offer",
        entityId: offer.id,
        requestId: id,
        metadata: { format: "pdf" },
      }),
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="offer-${offer.application.referenceNo}.pdf"`,
        "cache-control": "private, no-store",
        "x-request-id": id,
      },
    });
  } catch (error) {
    return errorResponse(error, id);
  }
}
