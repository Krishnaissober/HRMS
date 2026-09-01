import { CandidateForm } from "@/components/candidates/CandidateForm";
import { FormDescription } from "@/components/candidates/FormDescription";
import { db } from "@/lib/db";

export default async function PublicApplicationPage({ params, searchParams }: { params: Promise<{ organizationSlug: string }>; searchParams: Promise<{ requisitionId?: string; position?: string; description?: string; experienceRequired?: string; skillsRequired?: string; fields?: string }> }) {
  const { organizationSlug } = await params;
  const { requisitionId, position, description, experienceRequired, skillsRequired, fields } = await searchParams;
  const organization = await db.organization.findUnique({ where: { slug: organizationSlug }, select: { id: true } });
  const requisitions = organization ? await db.jobRequisition.findMany({ where: { organizationId: organization.id, status: "PUBLISHED" }, orderBy: { openedAt: "desc" }, select: { id: true, referenceNo: true, title: true } }) : [];
  return <main className="page-shell"><section className="panel"><p className="eyebrow">Triple Minds Careers</p><h1>Apply to Join Triple Minds</h1><p>Your application is submitted securely to the Triple Minds HR team for review.</p>{description && <FormDescription value={description} />}<CandidateForm mode="ONLINE" organizationSlug={organizationSlug} requisitionId={requisitionId} position={position} requisitions={requisitions} formRequirements={{ experience: experienceRequired, skills: skillsRequired }} formFields={fields?.split(",").filter(Boolean)} showInterviewDetails={false} /></section></main>;
}
