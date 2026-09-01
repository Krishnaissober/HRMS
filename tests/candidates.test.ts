import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as publicCandidatePost } from "@/app/api/v1/public/candidates/route";
import { canTransition } from "@/modules/candidates/constants";
import { candidateFieldsSchema, publicCandidateSchema, validateDocumentMetadata } from "@/modules/candidates/schemas";

const validFields = {
  firstName: "Asha",
  lastName: "Rao",
  email: "asha@example.test",
  phone: "+919999999999",
  roleOfInterest: "Product Designer",
  declarationAccepted: true,
  consentAccepted: true,
  documents: [],
};

describe("candidate intake validation", () => {
  it("accepts supported online/walk-in candidate fields", () => {
    expect(candidateFieldsSchema.parse(validFields).roleOfInterest).toBe("Product Designer");
  });

  it("requires declaration and consent", () => {
    expect(() => candidateFieldsSchema.parse({ ...validFields, consentAccepted: false })).toThrow();
  });

  it("requires a requisition for public applications", () => {
    expect(() => publicCandidateSchema.parse({ ...validFields, organizationSlug: "acme" })).toThrow();
    expect(publicCandidateSchema.parse({ ...validFields, organizationSlug: "acme", requisitionId: "req-1" }).requisitionId).toBe("req-1");
  });

  it("rejects mismatched upload metadata", () => {
    expect(() => validateDocumentMetadata({ fileName: "resume.exe", contentType: "application/pdf" })).toThrow();
    expect(() => validateDocumentMetadata({ fileName: "resume.pdf", contentType: "application/pdf" })).not.toThrow();
  });
});

describe("candidate status transitions", () => {
  it("allows the SRS pipeline progression", () => {
    expect(canTransition("APPLIED", "SCREENING")).toBe(true);
    expect(canTransition("APPLIED", "SHORTLISTED")).toBe(true);
    expect(canTransition("SCREENING", "SHORTLISTED")).toBe(true);
    expect(canTransition("SHORTLISTED", "INTERVIEW")).toBe(true);
  });

  it("rejects terminal or out-of-order transitions", () => {
    expect(canTransition("APPLIED", "SELECTED")).toBe(false);
    expect(canTransition("REJECTED", "SCREENING")).toBe(false);
  });
});

describe("public candidate API", () => {
  it("returns a consistent validation response", async () => {
    const request = new NextRequest("http://localhost/api/v1/public/candidates", { method: "POST", body: JSON.stringify({ organizationSlug: "acme" }), headers: { "content-type": "application/json" } });
    const response = await publicCandidatePost(request);
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
