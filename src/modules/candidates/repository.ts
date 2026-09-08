import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { AppError, validationError } from "@/lib/errors";
import { encryptPii } from "@/lib/pii";
import type { Prisma } from "@prisma/client";
import type { CandidateStatus, CandidateSource } from "@/modules/candidates/constants";

function protectSensitiveFormData(fields: Record<string, unknown>) {
  const protectedFields = { ...fields };
  for (const field of ["aadhaarNumber", "panNumber", "bankAccountNumber"]) {
    const value = protectedFields[field];
    if (typeof value === "string" && value.trim()) {
      protectedFields[field] = encryptPii(value.trim());
    }
  }
  return protectedFields;
}

export async function findOrganizationBySlug(slug: string) {
  return db.organization.findUnique({ where: { slug, status: "ACTIVE" } });
}

export async function findCandidateMatch(organizationId: string, identifier: string) {
  const value = identifier.trim();
  if (!value) return null;
  const normalizedEmail = value.toLowerCase();
  const normalizedPhone = value.replace(/[^0-9+]/g, "");
  return db.candidate.findFirst({
    where: {
      organizationId,
      OR: [{ email: { equals: normalizedEmail } }, { phone: normalizedPhone }],
    },
    select: {
      id: true,
      referenceNo: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      addressLine1: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      education: true,
      employmentHistory: true,
      currentCompany: true,
      howFound: true,
      otherSource: true,
      referenceName: true,
      reasonForJobChange: true,
      professionalReference: true,
      professionalReferenceName: true,
      professionalReferenceProfile: true,
      professionalReferenceExperience: true,
      professionalReferenceContact: true,
      signatureName: true,
      acknowledgementDate: true,
      expectedCompensation: true,
      ctc: true,
      hikePercentage: true,
      noticePeriod: true,
      roleOfInterest: true,
      experience: true,
      source: true,
      status: true,
    },
  });
}

export async function createCandidateIntake(data: {
  organizationId: string;
  source: CandidateSource;
  fields: Record<string, unknown>;
  formData: Record<string, unknown>;
  requisitionId?: string;
  documents: Array<{
    kind: string;
    objectKey: string;
    fileName: string;
    contentType: string;
    byteSize: number;
  }>;
  actorUserId?: string;
  requestId?: string;
}) {
  const referenceNo = `CAND-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  return db.$transaction(async (tx) => {
    let requisition = data.requisitionId
      ? await tx.jobRequisition.findFirst({
          where: { id: data.requisitionId, organizationId: data.organizationId },
        })
      : null;

    if (!requisition) {
      requisition = await tx.jobRequisition.findFirst({
        where: { organizationId: data.organizationId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!requisition) {
      requisition = await tx.jobRequisition.create({
        data: {
          organizationId: data.organizationId,
          referenceNo: `REQ-GEN-${Date.now()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
          title: String(data.fields.roleOfInterest || "General Candidate Application"),
          status: "PUBLISHED",
        },
      });
    }
    const normalizedEmail = String(data.fields.email).trim().toLowerCase();
    const normalizedPhone = String(data.fields.phone).replace(/[^0-9+]/g, "");
    const existing = await tx.candidate.findFirst({
      where: {
        organizationId: data.organizationId,
        OR: [{ email: { equals: normalizedEmail } }, { phone: normalizedPhone }],
      },
      orderBy: { createdAt: "asc" },
    });
    const candidate =
      existing ??
      (await tx.candidate.create({
        data: {
          organizationId: data.organizationId,
          referenceNo,
          firstName: String(data.fields.firstName),
          lastName: String(data.fields.lastName),
          email: normalizedEmail,
          phone: normalizedPhone,
          dateOfBirth: data.fields.dateOfBirth ? String(data.fields.dateOfBirth) : undefined,
          gender: data.fields.gender ? String(data.fields.gender) : undefined,
          addressLine1: data.fields.addressLine1 ? String(data.fields.addressLine1) : undefined,
          addressLine2: data.fields.addressLine2 ? String(data.fields.addressLine2) : undefined,
          city: data.fields.city ? String(data.fields.city) : undefined,
          state: data.fields.state ? String(data.fields.state) : undefined,
          country: data.fields.country ? String(data.fields.country) : undefined,
          postalCode: data.fields.postalCode ? String(data.fields.postalCode) : undefined,
          education: data.fields.education ? String(data.fields.education) : undefined,
          employmentHistory: data.fields.employmentHistory
            ? String(data.fields.employmentHistory)
            : undefined,
          currentCompany: data.fields.currentCompany
            ? String(data.fields.currentCompany)
            : undefined,
          howFound: data.fields.howFound ? String(data.fields.howFound) : undefined,
          otherSource: data.fields.otherSource ? String(data.fields.otherSource) : undefined,
          referenceName: data.fields.referenceName ? String(data.fields.referenceName) : undefined,
          reasonForJobChange: data.fields.reasonForJobChange
            ? String(data.fields.reasonForJobChange)
            : undefined,
          professionalReference: data.fields.professionalReference
            ? String(data.fields.professionalReference)
            : undefined,
          professionalReferenceName: data.fields.professionalReferenceName
            ? String(data.fields.professionalReferenceName)
            : undefined,
          professionalReferenceProfile: data.fields.professionalReferenceProfile
            ? String(data.fields.professionalReferenceProfile)
            : undefined,
          professionalReferenceExperience: data.fields.professionalReferenceExperience
            ? String(data.fields.professionalReferenceExperience)
            : undefined,
          professionalReferenceContact: data.fields.professionalReferenceContact
            ? String(data.fields.professionalReferenceContact)
            : undefined,
          signatureName: data.fields.signatureName ? String(data.fields.signatureName) : undefined,
          acknowledgementDate: data.fields.acknowledgementDate
            ? String(data.fields.acknowledgementDate)
            : undefined,
          skills: data.fields.skills ? String(data.fields.skills) : undefined,
          expectedCompensation: data.fields.expectedCompensation
            ? String(data.fields.expectedCompensation)
            : undefined,
          ctc: data.fields.ctc
            ? String(data.fields.ctc)
            : data.fields.expectedCompensation
              ? String(data.fields.expectedCompensation)
              : undefined,
          hikePercentage: data.fields.hikePercentage
            ? String(data.fields.hikePercentage)
            : undefined,
          noticePeriod: data.fields.noticePeriod ? String(data.fields.noticePeriod) : undefined,
          aadhaarNumber: data.fields.aadhaarNumber
            ? encryptPii(String(data.fields.aadhaarNumber).replace(/\s|-/g, ""))
            : undefined,
          panNumber: data.fields.panNumber
            ? encryptPii(String(data.fields.panNumber).replace(/\s/g, "").toUpperCase())
            : undefined,
          bankAccountName: data.fields.bankAccountName
            ? String(data.fields.bankAccountName)
            : undefined,
          bankName: data.fields.bankName ? String(data.fields.bankName) : undefined,
          bankBranchName: data.fields.bankBranchName
            ? String(data.fields.bankBranchName)
            : undefined,
          bankAccountNumber: data.fields.bankAccountNumber
            ? encryptPii(String(data.fields.bankAccountNumber).trim())
            : undefined,
          bankIfscCode: data.fields.bankIfscCode
            ? String(data.fields.bankIfscCode).toUpperCase()
            : undefined,
          bankAccountType: data.fields.bankAccountType
            ? String(data.fields.bankAccountType)
            : undefined,
          roleOfInterest: data.fields.roleOfInterest
            ? String(data.fields.roleOfInterest)
            : requisition.title,
          experience: data.fields.experience ? String(data.fields.experience) : undefined,
          source: data.source,
          declarationAccepted: Boolean(data.fields.declarationAccepted),
          consentAccepted: Boolean(data.fields.consentAccepted),
        },
      }));
    const application = await tx.application.upsert({
      where: {
        candidateId_requisitionId: { candidateId: candidate.id, requisitionId: requisition.id },
      },
      update: {},
      create: {
        organizationId: data.organizationId,
        referenceNo: `APP-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        candidateId: candidate.id,
        requisitionId: requisition.id,
        status: "APPLIED",
      },
    });
    const previousSubmission = await tx.candidateSubmission.findFirst({
      where: { candidateId: candidate.id, applicationId: application.id, source: data.source },
    });
    if (previousSubmission)
      throw new AppError("CONFLICT", "This candidate has already submitted this form.", 409);
    const submission = await tx.candidateSubmission.create({
      data: {
        organizationId: data.organizationId,
        candidateId: candidate.id,
        applicationId: application.id,
        referenceNo,
        source: data.source,
        formData: protectSensitiveFormData(data.formData) as Prisma.InputJsonValue,
      },
    });
    if (data.documents.length)
      await tx.candidateDocument.createMany({
        data: data.documents.map((document) => ({
          ...document,
          organizationId: data.organizationId,
          candidateId: candidate.id,
        })),
      });
    if (data.source === "WALK_IN")
      await tx.candidateVisit.create({
        data: {
          organizationId: data.organizationId,
          candidateId: candidate.id,
          visitDate: data.fields.visitDate ? new Date(String(data.fields.visitDate)) : new Date(),
          purpose: data.fields.visitPurpose ? String(data.fields.visitPurpose) : undefined,
        },
      });
    await tx.candidateActivity.create({
      data: {
        organizationId: data.organizationId,
        candidateId: candidate.id,
        actorUserId: data.actorUserId,
        action: existing ? "DUPLICATE_INTAKE_MATCHED" : "CANDIDATE_CREATED",
        toStatus: candidate.status,
        metadata: {
          source: data.source,
          submissionReferenceNo: submission.referenceNo,
          applicationId: application.id,
        },
      },
    });
    await writeAuditEvent(tx, {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: data.source === "ONLINE" ? "PUBLIC_CANDIDATE_SUBMITTED" : "WALK_IN_CANDIDATE_CREATED",
      entityType: "Candidate",
      entityId: candidate.id,
      requestId: data.requestId,
      metadata: {
        source: data.source,
        duplicateMatched: Boolean(existing),
        applicationId: application.id,
      },
    });
    const hrRecipients = await tx.membership.findMany({
      where: { organizationId: data.organizationId, status: "ACTIVE" },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    const recipientIds = hrRecipients
      .filter((membership) =>
        membership.roles.some((membershipRole) =>
          membershipRole.role.permissions.some(
            (rolePermission) => rolePermission.permission.name === "candidates.read",
          ),
        ),
      )
      .map((membership) => membership.userId);
    if (data.actorUserId && !recipientIds.includes(data.actorUserId))
      recipientIds.push(data.actorUserId);
    if (recipientIds.length)
      await tx.appNotification.createMany({
        data: recipientIds.map((userId) => ({
          organizationId: data.organizationId,
          userId,
          eventType:
            data.source === "WALK_IN"
              ? "WALK_IN_CANDIDATE_RECEIVED"
              : "CANDIDATE_APPLICATION_RECEIVED",
          title:
            data.source === "WALK_IN"
              ? "New walk-in candidate received"
              : "New candidate application received",
          body: `${candidate.firstName} ${candidate.lastName} · ${candidate.roleOfInterest}`,
          actionableUrl: `/hr/candidates/${candidate.id}`,
          channels: ["IN_APP"],
        })),
      });
    return { candidate, submission, application, duplicateMatched: Boolean(existing) };
  });
}

export async function listCandidates(
  organizationId: string,
  query: {
    q?: string;
    view?: "archive";
    status?: CandidateStatus;
    source?: CandidateSource;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
    direction: "asc" | "desc";
  },
) {
  const where = {
    organizationId,
    ...(query.view === "archive"
      ? {
          status: {
            in: query.status
              ? ["HOLD", "REJECTED"].filter((status) => status === query.status)
              : ["HOLD", "REJECTED"],
          },
        }
      : query.status
        ? { status: query.status }
        : {}),
    ...(query.source ? { source: query.source } : {}),
    ...(query.q
      ? {
          OR: [
            { referenceNo: { contains: query.q } },
            { firstName: { contains: query.q } },
            { lastName: { contains: query.q } },
            { email: { contains: query.q } },
            { phone: { contains: query.q } },
            { roleOfInterest: { contains: query.q } },
            { skills: { contains: query.q } },
          ],
        }
      : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await db.$transaction([
    db.candidate.findMany({
      where,
      orderBy: { createdAt: query.direction },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        referenceNo: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        roleOfInterest: true,
        source: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        applications: {
          select: { id: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        interviews: {
          select: { id: true, status: true, scheduledStart: true, scheduledEnd: true },
          orderBy: { scheduledStart: "desc" },
        },
      },
    }),
    db.candidate.count({ where }),
  ]);
  return { items, total };
}

export async function getCandidate(organizationId: string, id: string) {
  return db.candidate.findFirst({
    where: { id, organizationId },
    include: {
      submissions: {
        select: { id: true, source: true, referenceNo: true, submittedAt: true, formData: true },
        orderBy: { submittedAt: "desc" },
      },
      documents: true,
      applications: { include: { requisition: true } },
      interviews: {
        select: {
          id: true,
          applicationId: true,
          status: true,
          scheduledStart: true,
          scheduledEnd: true,
        },
        orderBy: { scheduledStart: "desc" },
      },
      visits: { orderBy: { visitDate: "desc" } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export async function updateCandidateDetails(
  organizationId: string,
  id: string,
  data: Record<string, unknown>,
  actorUserId: string,
  requestId?: string,
) {
  const editableFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "dateOfBirth",
    "gender",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "country",
    "postalCode",
    "education",
    "tenthInstitution",
    "tenthBoard",
    "tenthPassingYear",
    "tenthScore",
    "twelfthInstitution",
    "twelfthBoard",
    "twelfthPassingYear",
    "twelfthScore",
    "collegeName",
    "collegeDegree",
    "collegePassingYear",
    "collegeScore",
    "employmentHistory",
    "currentCompany",
    "howFound",
    "otherSource",
    "referenceName",
    "reasonForJobChange",
    "professionalReference",
    "professionalReferenceName",
    "professionalReferenceProfile",
    "professionalReferenceExperience",
    "professionalReferenceContact",
    "signatureName",
    "acknowledgementDate",
    "skills",
    "expectedCompensation",
    "ctc",
    "hikePercentage",
    "noticePeriod",
    "bankAccountName",
    "bankName",
    "bankBranchName",
    "bankAccountNumber",
    "bankIfscCode",
    "bankAccountType",
    "roleOfInterest",
    "experience",
  ] as const;
  const values = Object.fromEntries(
    editableFields
      .filter((field) => data[field] !== undefined)
      .map((field) => [field, data[field] === "" ? null : String(data[field])]),
  );
  return db.$transaction(async (tx) => {
    const current = await tx.candidate.findFirst({ where: { id, organizationId } });
    if (!current) return null;
    if (current.status !== "SELECTED") {
      throw validationError({
        candidate: ["Candidate details can only be edited after the candidate is selected."],
      });
    }
    const updated = await tx.candidate.update({ where: { id: current.id }, data: values });
    await tx.candidateActivity.create({
      data: {
        organizationId,
        candidateId: current.id,
        actorUserId,
        action: "CANDIDATE_DETAILS_UPDATED",
        note: "Candidate details corrected by HR",
        metadata: { fields: Object.keys(values) },
      },
    });
    await writeAuditEvent(tx, {
      organizationId,
      actorUserId,
      action: "CANDIDATE_DETAILS_UPDATED",
      entityType: "Candidate",
      entityId: current.id,
      requestId,
      metadata: { fields: Object.keys(values) },
    });
    return updated;
  });
}

export async function updateCandidateStatus(
  organizationId: string,
  id: string,
  status: CandidateStatus,
  reason?: string,
  notes?: string,
  actorUserId?: string,
  requestId?: string,
) {
  return db.$transaction(async (tx) => {
    const candidate = await tx.candidate.findFirst({ where: { id, organizationId } });
    if (!candidate) return null;
    const updated = await tx.candidate.update({
      where: { id: candidate.id },
      data: { status, statusReason: reason || null, statusNotes: notes || null },
    });
    await tx.candidateActivity.create({
      data: {
        organizationId,
        candidateId: id,
        actorUserId,
        action: "STATUS_CHANGED",
        fromStatus: candidate.status,
        toStatus: status,
        note: notes || reason,
      },
    });
    await writeAuditEvent(tx, {
      organizationId,
      actorUserId,
      action: "CANDIDATE_STATUS_CHANGED",
      entityType: "Candidate",
      entityId: id,
      requestId,
      metadata: { fromStatus: candidate.status, toStatus: status, reason },
    });
    return { candidate: updated, previousStatus: candidate.status };
  });
}
