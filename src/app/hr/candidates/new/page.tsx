import { CandidateIntakeChooserClient } from "@/components/candidates/CandidateIntakeChooserClient";
import { AbortedFormsList } from "@/components/candidates/AbortedFormsList";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function CandidateIntakeChooser() {
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
  const [onlineCandidates, walkInCandidates, submissions, recentSubmissions] = organization
    ? await Promise.all([
        db.candidate.count({ where: { organizationId: organization.id, source: "ONLINE" } }),
        db.candidate.count({ where: { organizationId: organization.id, source: "WALK_IN" } }),
        db.candidateSubmission.count({ where: { organizationId: organization.id } }),
        db.candidateSubmission.findMany({
          where: { organizationId: organization.id },
          orderBy: { submittedAt: "desc" },
          take: 5,
          select: {
            id: true,
            referenceNo: true,
            source: true,
            submittedAt: true,
            candidate: {
              select: { id: true, firstName: true, lastName: true, roleOfInterest: true },
            },
          },
        }),
      ])
    : [0, 0, 0, []];

  return (
    <main className="page-shell forms-dashboard-page">
      <section className="forms-dashboard-hero">
        <div>
          <p className="eyebrow">Recruitment workspace</p>
          <h1>Forms dashboard</h1>
          <p className="page-intro">
            Create, preview, publish, and share candidate forms from one focused workspace.
          </p>
        </div>
        <div className="forms-dashboard-hero-actions">
          <Link className="button-link secondary" href="/hr/candidates">
            View candidates
          </Link>
          <Link className="button-link" href="/hr/recruitment/dashboard">
            Recruitment dashboard
          </Link>
        </div>
      </section>
      <section className="forms-stat-grid" aria-label="Form activity summary">
        <Link href="#form-editor-social" className="forms-stat-card">
          <span className="forms-stat-icon indigo">↗</span>
          <span>
            <small>Social applications</small>
            <strong>{onlineCandidates}</strong>
            <em>Candidate-facing form</em>
          </span>
        </Link>
        <Link href="#form-editor-walk-in" className="forms-stat-card">
          <span className="forms-stat-icon sky">✓</span>
          <span>
            <small>Walk-in records</small>
            <strong>{walkInCandidates}</strong>
            <em>Reception and HR intake</em>
          </span>
        </Link>
        <Link href="/hr/candidates" className="forms-stat-card">
          <span className="forms-stat-icon emerald">▣</span>
          <span>
            <small>Total submissions</small>
            <strong>{submissions}</strong>
            <em>All submitted forms</em>
          </span>
        </Link>
        <Link href="#form-editor" className="forms-stat-card">
          <span className="forms-stat-icon amber">⌁</span>
          <span>
            <small>Published positions</small>
            <strong>{requisitions.length}</strong>
            <em>Available for applicants</em>
          </span>
        </Link>
      </section>
      <section className="forms-workspace-card">
        <CandidateIntakeChooserClient />
      </section>
      <section className="forms-bottom-grid">
        <div className="forms-recent-card">
          <div className="forms-card-heading">
            <div>
              <p className="eyebrow">Latest activity</p>
              <h2>Recent submissions</h2>
            </div>
            <Link href="/hr/candidates">View all</Link>
          </div>
          {recentSubmissions.length ? (
            <div className="forms-recent-list">
              {recentSubmissions.map((submission) => (
                <Link
                  href={
                    submission.candidate
                      ? `/hr/candidates/${submission.candidate.id}`
                      : "/hr/candidates"
                  }
                  key={submission.id}
                >
                  <span className="forms-recent-avatar">
                    {submission.candidate?.firstName?.slice(0, 1) || "C"}
                  </span>
                  <span>
                    <strong>
                      {submission.candidate
                        ? `${submission.candidate.firstName} ${submission.candidate.lastName}`
                        : submission.referenceNo}
                    </strong>
                    <small>
                      {submission.candidate?.roleOfInterest || "Candidate submission"} ·{" "}
                      {submission.source === "WALK_IN" ? "Walk-in form" : "Social form"}
                    </small>
                  </span>
                  <time>{new Date(submission.submittedAt).toLocaleDateString()}</time>
                </Link>
              ))}
            </div>
          ) : (
            <p className="empty-state">No form submissions yet.</p>
          )}
        </div>
        <AbortedFormsList />
      </section>
    </main>
  );
}
