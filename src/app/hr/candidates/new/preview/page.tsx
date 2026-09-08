import { redirect } from "next/navigation";
import Link from "next/link";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import { FormDescription } from "@/components/candidates/FormDescription";
import { getAuthenticatedContext } from "@/lib/tenant";
import { db } from "@/lib/db";

type SearchParams = {
  kind?: string;
  requisitionId?: string;
  position?: string;
  description?: string;
  experienceRequired?: string;
  skillsRequired?: string;
  fields?: string;
};

export default async function CandidateFormPreview({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  let context;
  try {
    context = await getAuthenticatedContext();
  } catch {
    redirect("/");
  }
  const params = await searchParams;
  const kind = params.kind === "walk-in" ? "walk-in" : "social";
  const organization = await db.organization.findUnique({
    where: { id: context.organizationId },
    select: { slug: true },
  });
  if (!organization) redirect("/");
  const requisitions = await db.jobRequisition.findMany({
    where: { organizationId: context.organizationId, status: "PUBLISHED" },
    orderBy: { openedAt: "desc" },
    select: { id: true, referenceNo: true, title: true },
  });
  const editUrl =
    kind === "social"
      ? "/hr/candidates/new#form-editor-social"
      : "/hr/candidates/new#form-editor-walk-in";
  return (
    <main className="page-shell">
      <section className="panel">
        <div className="review-page-heading">
          <div>
            <p className="eyebrow">Recruitment Form · HR Review</p>
            <h1>{kind === "social" ? "Social media application" : "Walk-in form"}</h1>
            <p className="page-intro">
              Review the candidate-facing form and submit through the authenticated HR workflow.
            </p>
          </div>
          <Link className="button-link" href={editUrl}>
            Edit form
          </Link>
        </div>
        {kind === "social" && params.description && <FormDescription value={params.description} />}
        <CandidateForm
          mode={kind === "social" ? "ONLINE" : "WALK_IN"}
          context="hr-preview"
          organizationId={context.organizationId}
          organizationSlug={organization.slug}
          requisitionId={params.requisitionId}
          position={params.position}
          requisitions={requisitions}
          formRequirements={{
            experience: params.experienceRequired,
            skills: params.skillsRequired,
          }}
          formFields={params.fields?.split(",").filter(Boolean)}
          showInterviewDetails={kind === "walk-in"}
        />
      </section>
    </main>
  );
}
