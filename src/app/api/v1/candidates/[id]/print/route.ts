import { NextRequest } from "next/server";
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/rbac";
import { CANDIDATE_PERMISSIONS } from "@/modules/candidates/constants";
import { getCandidate } from "@/modules/candidates/repository";
import { errorResponse, notFoundError } from "@/lib/errors";
import { requestId } from "@/lib/request";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";

const W = 595,
  H = 842,
  L = 32,
  R = 563;
const black = rgb(0.04, 0.06, 0.1),
  gray = rgb(0.3, 0.32, 0.36),
  blue = rgb(0, 0.38, 0.62);
const text = (value: unknown) =>
  value === null || value === undefined || String(value).trim() === "" ? "" : String(value);
const date = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : text(value);

function labelLine(
  page: PDFPage,
  label: string,
  value: unknown,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  bold: PDFFont,
) {
  page.drawText(label, { x, y, size: 9, font: bold, color: black });
  const labelWidth = bold.widthOfTextAtSize(label, 9) + 5;
  page.drawText(text(value), { x: x + labelWidth, y, size: 9, font, color: black });
  page.drawLine({
    start: { x: x + labelWidth, y: y - 2 },
    end: { x: x + width, y: y - 2 },
    thickness: 0.5,
    color: gray,
  });
}

function section(page: PDFPage, title: string, y: number, bold: PDFFont) {
  page.drawText(title, { x: L, y, size: 11, font: bold, color: black });
  page.drawLine({
    start: { x: L, y: y - 7 },
    end: { x: R, y: y - 7 },
    thickness: 0.55,
    color: gray,
  });
  return y - 30;
}

function checkbox(
  page: PDFPage,
  label: string,
  checked: boolean,
  x: number,
  y: number,
  font: PDFFont,
) {
  page.drawRectangle({ x, y: y - 2, width: 7, height: 7, borderColor: gray, borderWidth: 0.6 });
  if (checked) page.drawText("x", { x: x + 1, y: y - 1, size: 8, font, color: blue });
  page.drawText(label, { x: x + 12, y, size: 8.5, font, color: black });
}

function footer(page: PDFPage, font: PDFFont) {
  page.drawLine({ start: { x: L, y: 42 }, end: { x: R, y: 42 }, thickness: 0.5, color: gray });
  page.drawText(
    "Triple Minds | 3rd Floor, IT TOWER, E-261, Phase 8B, Sector 74, Sahibzada Ajit Singh Nagar, Punjab - 160055 | Phone: 01724500666 | Website: www.tripleminds.co",
    { x: L, y: 28, size: 6.2, font, color: gray },
  );
}

function wrappedLines(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const words = text(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["Not provided"];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    await requirePermission(
      context.session.user.id,
      context.organizationId,
      CANDIDATE_PERMISSIONS.read,
    );
    const candidate = await getCandidate(context.organizationId, (await params).id);
    if (!candidate) throw notFoundError();
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    const page1 = pdf.addPage([W, H]);
    page1.drawText("TRIPLE MINDS", { x: L, y: 800, size: 18, font: bold, color: blue });
    page1.drawText("Consulting | Development | Marketing", {
      x: L,
      y: 784,
      size: 8,
      font,
      color: gray,
    });
    let y = 750;
    y = section(page1, "Candidate Information:", y, bold);
    labelLine(page1, "Full Name:", fullName, L, y, 270, font, bold);
    labelLine(page1, "Date of Birth:", date(candidate.dateOfBirth), 315, y, 248, font, bold);
    y -= 28;
    labelLine(page1, "Gender:", candidate.gender, L, y, 270, font, bold);
    labelLine(page1, "Phone Number:", candidate.phone, 315, y, 248, font, bold);
    y -= 28;
    labelLine(page1, "Email ID:", candidate.email, L, y, 270, font, bold);
    labelLine(
      page1,
      "Address:",
      [
        candidate.addressLine1,
        candidate.city,
        candidate.state,
        candidate.country,
        candidate.postalCode,
      ]
        .filter(Boolean)
        .join(", "),
      315,
      y,
      248,
      font,
      bold,
    );
    y -= 42;
    y = section(page1, "Job Details:", y, bold);
    labelLine(page1, "Position Applied For:", candidate.roleOfInterest, L, y, 270, font, bold);
    labelLine(page1, "Interview Date:", "", 315, y, 248, font, bold);
    y -= 28;
    page1.drawText("How did you find Triple Minds?", {
      x: L,
      y,
      size: 9,
      font: bold,
      color: black,
    });
    y -= 20;
    checkbox(page1, "LinkedIn Post", candidate.howFound === "LinkedIn Post", L, y, font);
    checkbox(page1, "Company Website", candidate.howFound === "Company Website", 160, y, font);
    checkbox(
      page1,
      "Job Portal (e.g., Naukri / Indeed)",
      candidate.howFound === "Job Portal",
      315,
      y,
      font,
    );
    y -= 20;
    checkbox(page1, "Reference (Friend/Colleague)", candidate.howFound === "Reference", L, y, font);
    checkbox(
      page1,
      `Mention Name: ${candidate.referenceName || ""}`,
      Boolean(candidate.referenceName),
      230,
      y,
      font,
    );
    y -= 20;
    checkbox(
      page1,
      "Social Media (Instagram / Facebook / Twitter)",
      candidate.howFound === "Social Media",
      L,
      y,
      font,
    );
    checkbox(
      page1,
      `Other: ${candidate.otherSource || ""}`,
      Boolean(candidate.otherSource),
      315,
      y,
      font,
    );
    y -= 32;
    y = section(page1, "Professional Background:", y, bold);
    labelLine(page1, "Current / Last Company:", candidate.currentCompany, L, y, 270, font, bold);
    labelLine(
      page1,
      "Total Experience:",
      `${text(candidate.experience)} Years Months`,
      315,
      y,
      248,
      font,
      bold,
    );
    y -= 28;
    labelLine(
      page1,
      "Last/Current Salary (CTC):",
      candidate.ctc || candidate.expectedCompensation,
      L,
      y,
      270,
      font,
      bold,
    );
    labelLine(page1, "Expected Hike (%):", candidate.hikePercentage, 315, y, 248, font, bold);
    y -= 28;
    labelLine(page1, "Notice Period:", candidate.noticePeriod, L, y, 270, font, bold);
    labelLine(page1, "Highest Qualification:", candidate.education, 315, y, 248, font, bold);
    y -= 32;
    labelLine(page1, "Key Skills:", candidate.skills, L, y, 270, font, bold);
    labelLine(
      page1,
      "Reason for Job Change:",
      candidate.reasonForJobChange,
      315,
      y,
      248,
      font,
      bold,
    );
    y -= 38;
    y = section(page1, "Professional Reference:", y, bold);
    page1.drawText(
      "S.No    Name                         Profile                 Experience       Contact No",
      { x: L, y, size: 8.5, font: bold, color: black },
    );
    page1.drawLine({
      start: { x: L, y: y - 7 },
      end: { x: R, y: y - 7 },
      thickness: 0.5,
      color: gray,
    });
    footer(page1, font);

    const page2 = pdf.addPage([W, H]);
    page2.drawText("TRIPLE MINDS", { x: L, y: 800, size: 18, font: bold, color: blue });
    page2.drawText("Consulting | Development | Marketing", {
      x: L,
      y: 784,
      size: 8,
      font,
      color: gray,
    });
    y = 750;
    y = section(page2, "Acknowledgement:", y, bold);
    page2.drawText(
      "I hereby declare that the information provided above is true and correct to the best of my",
      { x: L, y, size: 9, font, color: black },
    );
    page2.drawText("knowledge.", { x: L, y: y - 14, size: 9, font, color: black });
    y -= 48;
    labelLine(
      page2,
      "Signature of Candidate:",
      candidate.signatureName || fullName,
      L,
      y,
      270,
      font,
      bold,
    );
    labelLine(page2, "Date:", date(candidate.acknowledgementDate), 315, y, 248, font, bold);
    y -= 52;
    page2.drawText("(For HR Use Only)", { x: 250, y, size: 12, font: bold, color: black });
    page2.drawLine({
      start: { x: 250, y: y - 3 },
      end: { x: 390, y: y - 3 },
      thickness: 0.8,
      color: black,
    });
    y -= 30;
    page2.drawText("filled by HR only", { x: L, y, size: 9, font: bold, color: black });
    y -= 26;
    labelLine(
      page2,
      "Interview Scheduled by",
      candidate.hrInterviewScheduledBy,
      L,
      y,
      250,
      font,
      bold,
    );
    labelLine(page2, "Interviewer Name", candidate.hrInterviewerName, 315, y, 248, font, bold);
    y -= 30;
    page2.drawText("Status:", { x: L, y, size: 9, font: bold, color: black });
    checkbox(page2, "Shortlisted", candidate.status === "SHORTLISTED", 92, y, font);
    checkbox(page2, "On Hold", candidate.status === "HOLD", 220, y, font);
    checkbox(page2, "Rejected", candidate.status === "REJECTED", 350, y, font);
    y -= 30;
    page2.drawText("Rating:", { x: L, y, size: 9, font: bold, color: black });
    labelLine(page2, "Communication:", candidate.hrCommunicationRating, 92, y, 235, font, bold);
    labelLine(
      page2,
      "Technical Skills:",
      candidate.hrTechnicalSkillsRating,
      340,
      y,
      223,
      font,
      bold,
    );
    y -= 30;
    labelLine(page2, "Overall Fit:", candidate.hrOverallFit, L, y, 270, font, bold);
    y -= 30;
    page2.drawText("Comments:", { x: L, y, size: 9, font: bold, color: black });
    const commentLines = wrappedLines(candidate.hrComments, font, 9, R - 105);
    commentLines
      .slice(0, 5)
      .forEach((line, index) =>
        page2.drawText(line, { x: 105, y: y - index * 14, size: 9, font, color: black }),
      );
    page2.drawLine({
      start: { x: L, y: y - 18 },
      end: { x: R, y: y - 18 },
      thickness: 0.5,
      color: gray,
    });
    footer(page2, font);
    const bytes = await pdf.save();
    await db.$transaction((tx) =>
      writeAuditEvent(tx, {
        organizationId: context.organizationId,
        actorUserId: context.session.user.id,
        action: "CANDIDATE_PROFILE_PDF_GENERATED",
        entityType: "Candidate",
        entityId: candidate.id,
        requestId: id,
        metadata: { format: "pdf", template: "walk-in-form" },
      }),
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${candidate.referenceNo}-walk-in-form.pdf"`,
        "cache-control": "private, no-store",
        "x-request-id": id,
      },
    });
  } catch (error) {
    return errorResponse(error, id);
  }
}
