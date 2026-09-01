"use client";

import { useEffect, useState } from "react";

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  status: string;
  source: string;
  email: string;
  phone: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  education?: string | null;
  employmentHistory?: string | null;
  currentCompany?: string | null;
  howFound?: string | null;
  otherSource?: string | null;
  reasonForJobChange?: string | null;
  professionalReference?: string | null;
  professionalReferenceName?: string | null;
  professionalReferenceProfile?: string | null;
  professionalReferenceExperience?: string | null;
  professionalReferenceContact?: string | null;
  expectedCompensation?: string | null;
  ctc?: string | null;
  hikePercentage?: string | null;
  noticePeriod?: string | null;
  roleOfInterest: string;
  experience?: string | null;
  skills?: string | null;
  submissions: Array<{ id: string; source: string; referenceNo: string; submittedAt: string }>;
  applications: Array<{ id: string; referenceNo: string; status: string; requisition: { referenceNo: string; title: string } }>;
  documents: Array<{ id: string; fileName: string }>;
};

function value(input?: string | null) { return input?.trim() || "Not provided"; }

export default function CandidateSubmissionPreview({ params }: { params: Promise<{ id: string }> }) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [message, setMessage] = useState("Loading candidate form…");

  useEffect(() => {
    void (async () => {
      const { id } = await params;
      const response = await fetch(`/api/v1/candidates/${id}`);
      const result = await response.json();
      if (!response.ok) return setMessage(result.error?.message || "Could not load candidate form");
      setCandidate(result.data);
      setMessage("");
    })();
  }, [params]);

  if (!candidate) return <main className="page-shell"><section className="panel"><p role="status">{message}</p></section></main>;

  return <main className="page-shell"><section className="panel candidate-submission-preview"><div className="candidate-profile-header"><div><p className="eyebrow">Submitted candidate form</p><h1>{candidate.firstName} {candidate.lastName}</h1><p className="candidate-profile-meta">{candidate.referenceNo} · {candidate.source}</p></div><span className="candidate-status-badge">Read only</span></div><p className="form-message">This is a non-editable view of the information submitted by the candidate.</p><h2>Personal details</h2><dl className="details"><dt>Email</dt><dd>{candidate.email}</dd><dt>Mobile number</dt><dd>{candidate.phone}</dd><dt>First name</dt><dd>{candidate.firstName}</dd><dt>Last name</dt><dd>{candidate.lastName}</dd><dt>Date of birth</dt><dd>{value(candidate.dateOfBirth)}</dd><dt>Gender</dt><dd>{value(candidate.gender)}</dd></dl><h2>Professional details</h2><dl className="details"><dt>Position applied for</dt><dd>{value(candidate.roleOfInterest)}</dd><dt>Experience</dt><dd>{value(candidate.experience)}</dd><dt>Skills</dt><dd>{value(candidate.skills)}</dd><dt>Education</dt><dd>{value(candidate.education)}</dd><dt>Current / last company</dt><dd>{value(candidate.currentCompany)}</dd><dt>Employment history</dt><dd>{value(candidate.employmentHistory)}</dd><dt>Current CTC</dt><dd>{value(candidate.ctc)}</dd><dt>Expected hike</dt><dd>{value(candidate.hikePercentage)}</dd><dt>Expected CTC</dt><dd>{value(candidate.expectedCompensation)}</dd><dt>Notice period</dt><dd>{value(candidate.noticePeriod)}</dd></dl><h2>Address and source</h2><dl className="details"><dt>Address</dt><dd>{[candidate.addressLine1, candidate.addressLine2].filter(Boolean).join(", ") || "Not provided"}</dd><dt>City</dt><dd>{value(candidate.city)}</dd><dt>State</dt><dd>{value(candidate.state)}</dd><dt>Postal code</dt><dd>{value(candidate.postalCode)}</dd><dt>How did you hear about us?</dt><dd>{value(candidate.howFound || candidate.otherSource)}</dd><dt>Reason for job change</dt><dd>{value(candidate.reasonForJobChange)}</dd></dl><h2>Professional reference</h2><dl className="details"><dt>Reference name</dt><dd>{value(candidate.professionalReferenceName)}</dd><dt>Profile</dt><dd>{value(candidate.professionalReferenceProfile || candidate.professionalReference)}</dd><dt>Experience</dt><dd>{value(candidate.professionalReferenceExperience)}</dd><dt>Contact number</dt><dd>{value(candidate.professionalReferenceContact)}</dd></dl><h2>Applications</h2><ul>{candidate.applications.map((application) => <li key={application.id}>{application.referenceNo} · {application.requisition.title} · {application.status}</li>)}</ul><h2>Documents</h2>{candidate.documents.length ? <ul>{candidate.documents.map((document) => <li key={document.id}><a href={`/api/v1/candidates/${encodeURIComponent(candidate.id)}/documents/${encodeURIComponent(document.id)}/download`}>{document.fileName}</a></li>)}</ul> : <p className="empty-state">No documents submitted.</p>}<h2>Submission history</h2><ul>{candidate.submissions.map((submission) => <li key={submission.id}>{submission.source} · {submission.referenceNo} · {new Date(submission.submittedAt).toLocaleString()}</li>)}</ul></section></main>;
}
