import { z } from "zod";
import { validationError } from "@/lib/errors";
import { CANDIDATE_SOURCES, CANDIDATE_STATUSES } from "@/modules/candidates/constants";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalIfsc = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, "Enter a valid 11-character IFSC code")
  .optional()
  .or(z.literal(""));

export const documentInputSchema = z.object({
  kind: z.enum(["RESUME", "SUPPORTING"]),
  objectKey: z.string().trim().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

export const uploadUrlRequestSchema = z.object({
  kind: z.enum(["RESUME", "SUPPORTING"]),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

export const candidateFieldsSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(7).max(40),
  dateOfBirth: optionalText(30),
  gender: optionalText(30),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  country: optionalText(100),
  postalCode: optionalText(30),
  education: optionalText(5000),
  tenthInstitution: optionalText(200),
  tenthBoard: optionalText(200),
  tenthPassingYear: optionalText(10),
  tenthScore: optionalText(30),
  twelfthInstitution: optionalText(200),
  twelfthBoard: optionalText(200),
  twelfthPassingYear: optionalText(10),
  twelfthScore: optionalText(30),
  collegeName: optionalText(200),
  collegeDegree: optionalText(200),
  collegePassingYear: optionalText(10),
  collegeScore: optionalText(30),
  employmentHistory: optionalText(5000),
  currentCompany: optionalText(200),
  howFound: optionalText(100),
  otherSource: optionalText(200),
  referenceName: optionalText(200),
  reasonForJobChange: optionalText(1000),
  professionalReference: optionalText(1000),
  professionalReferenceName: optionalText(200),
  professionalReferenceProfile: optionalText(200),
  professionalReferenceExperience: optionalText(100),
  professionalReferenceContact: optionalText(100),
  signatureName: optionalText(200),
  acknowledgementDate: optionalText(30),
  skills: optionalText(2000),
  expectedCompensation: optionalText(100),
  ctc: optionalText(100),
  hikePercentage: optionalText(20),
  noticePeriod: optionalText(100),
  panNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, "Enter a valid 10-character PAN")
    .optional()
    .or(z.literal("")),
  aadhaarNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{12}$/, "Enter a valid 12-digit Aadhaar number")
    .optional()
    .or(z.literal("")),
  bankAccountName: optionalText(200),
  bankName: optionalText(200),
  bankBranchName: optionalText(200),
  bankAccountNumber: optionalText(34),
  bankIfscCode: optionalIfsc,
  bankAccountType: z.enum(["SAVINGS", "CURRENT"]).optional().or(z.literal("")),
  roleOfInterest: optionalText(200),
  experience: optionalText(100),
  declarationAccepted: z.literal(true),
  consentAccepted: z.literal(true),
  documents: z.array(documentInputSchema).max(5).default([]),
});

export const publicCandidateSchema = candidateFieldsSchema.extend({
  organizationSlug: z.string().trim().min(2).max(120),
  requisitionId: optionalText(100),
  source: z.literal("ONLINE").default("ONLINE"),
});

export const publicWalkInCandidateSchema = candidateFieldsSchema.extend({
  organizationSlug: z.string().trim().min(2).max(120),
  requisitionId: optionalText(100),
  source: z.literal("WALK_IN").default("WALK_IN"),
  visitDate: optionalText(100),
  visitPurpose: optionalText(500),
});

export const walkInCandidateSchema = candidateFieldsSchema.extend({
  requisitionId: optionalText(100),
  source: z.literal("WALK_IN").default("WALK_IN"),
  visitDate: optionalText(100),
  visitPurpose: optionalText(500),
});

export const candidateHrReviewSchema = z.object({
  status: z.enum(["SHORTLISTED", "HOLD", "REJECTED"]),
  interviewerName: z.string().trim().max(200).optional(),
  communicationRating: z.enum(["1", "2", "3", "4", "5"]),
  technicalSkillsRating: z.enum(["1", "2", "3", "4", "5"]),
  overallFit: z.enum(["1", "2", "3", "4", "5"]).optional(),
  comments: z.string().trim().min(1, "Add a summary of the interview").max(5000),
});

export const candidateDecisionEmailSchema = z.object({
  status: z.enum(["SHORTLISTED", "REJECTED"]),
});

export const authenticatedCandidateSchema = candidateFieldsSchema.extend({
  requisitionId: optionalText(100),
  source: z.enum(["ONLINE", "WALK_IN"]).default("WALK_IN"),
  visitDate: optionalText(100),
  visitPurpose: optionalText(500),
});

const candidateBankFieldsSchema = z.object({
  bankAccountName: optionalText(200),
  bankName: optionalText(200),
  bankBranchName: optionalText(200),
  bankAccountNumber: optionalText(34),
  bankIfscCode: optionalIfsc,
  bankAccountType: z.enum(["SAVINGS", "CURRENT"]).optional().or(z.literal("")),
});

export const candidateUpdateSchema = candidateFieldsSchema
  .omit({ documents: true, declarationAccepted: true, consentAccepted: true })
  .partial()
  .merge(candidateBankFieldsSchema);

export const statusUpdateSchema = z.object({
  status: z.enum(CANDIDATE_STATUSES),
  reason: optionalText(500),
  notes: optionalText(2000),
});

export const visitCheckInSchema = z.object({
  visitId: z.string().trim().min(1).max(100).optional(),
  visitDate: z.string().datetime().optional(),
  purpose: optionalText(500),
});

export const visitCheckOutSchema = z.object({
  visitId: z.string().trim().min(1).max(100),
});

export const candidateListSchema = z.object({
  view: z.enum(["archive"]).optional(),
  q: optionalText(200),
  status: z.enum(CANDIDATE_STATUSES).optional(),
  source: z.enum(CANDIDATE_SOURCES).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const publicUploadUrlSchema = z.object({
  organizationSlug: z.string().trim().min(2).max(120),
  kind: z.enum(["RESUME", "SUPPORTING"]),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

const extensionByContentType: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

export function validateDocumentMetadata(input: { fileName: string; contentType: string }) {
  const lowerName = input.fileName.toLowerCase();
  const validExtensions = extensionByContentType[input.contentType] || [];
  if (!validExtensions.some((extension) => lowerName.endsWith(extension)))
    throw validationError({
      fileName: ["File extension does not match the declared content type"],
    });
}

export type CandidateFields = z.infer<typeof candidateFieldsSchema>;
