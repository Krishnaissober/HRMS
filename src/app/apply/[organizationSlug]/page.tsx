import { CandidateForm } from "@/components/candidates/CandidateForm";
import { FormDescription } from "@/components/candidates/FormDescription";
import { db } from "@/lib/db";

export default async function PublicApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{
    requisitionId?: string;
    position?: string;
    description?: string;
    experienceRequired?: string;
    skillsRequired?: string;
    fields?: string;
  }>;
}) {
  const { organizationSlug } = await params;
  const { requisitionId, position, description, experienceRequired, skillsRequired, fields } =
    await searchParams;
  const organization = await db.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true },
  });
  const requisitions = organization
    ? await db.jobRequisition.findMany({
        where: { organizationId: organization.id, status: "PUBLISHED" },
        orderBy: { openedAt: "desc" },
        select: { id: true, referenceNo: true, title: true },
      })
    : [];
  const selectedRequisition = requisitions.find((item) => item.id === requisitionId);
  const positionUnavailable = Boolean(requisitionId && !selectedRequisition);
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Triple Minds Careers</p>
        <h1>Apply to Join Triple Minds</h1>
        <p>Your application is submitted securely to the Triple Minds HR team for review.</p>
        {description && <FormDescription value={description} />}
        {positionUnavailable ? (
          <p className="form-message" role="alert">
            This hiring position is no longer available. Please ask HR for a current application
            link.
          </p>
        ) : (
          <CandidateForm
            mode="ONLINE"
            organizationSlug={organizationSlug}
            requisitionId={selectedRequisition?.id}
            position={position}
            requisitions={requisitions}
            formRequirements={{ experience: experienceRequired, skills: skillsRequired }}
            formFields={fields?.split(",").filter(Boolean)}
            showInterviewDetails={false}
          />
        )}
      </section>
    </main>
  );
}
