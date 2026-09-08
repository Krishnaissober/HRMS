import { CandidateForm } from "@/components/candidates/CandidateForm";
import { db } from "@/lib/db";

export default async function PublicWalkInPage({
  searchParams,
}: {
  searchParams: Promise<{ requisitionId?: string; position?: string; fields?: string }>;
}) {
  const { requisitionId, position, fields } = await searchParams;
  const organization = await db.organization.findUnique({
    where: { slug: "triple-minds" },
    select: { id: true },
  });
  const requisitions = organization
    ? await db.jobRequisition.findMany({
        where: { organizationId: organization.id, status: "PUBLISHED" },
        orderBy: { openedAt: "desc" },
        select: { id: true, referenceNo: true, title: true },
      })
    : [];
  const defaultRequisitionId = requisitionId || requisitions[0]?.id;
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Triple Minds Walk-In Application</p>
        <h1>Complete your walk-in form</h1>
        <p>
          Use your email or mobile number to retrieve details you previously submitted. You can
          review and edit them before sending.
        </p>
        {!defaultRequisitionId ? (
          <p className="form-message">
            Walk-in applications are temporarily unavailable because no published hiring position is
            open.
          </p>
        ) : (
          <CandidateForm
            mode="WALK_IN"
            organizationSlug="triple-minds"
            requisitionId={defaultRequisitionId}
            position={position}
            requisitions={requisitions}
            formFields={fields?.split(",").filter(Boolean)}
            publicWalkIn
          />
        )}
      </section>
    </main>
  );
}
