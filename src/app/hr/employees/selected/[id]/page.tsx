"use client";

import { useEffect, useState } from "react";

type Candidate = {
  referenceNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  roleOfInterest: string;
  experience?: string | null;
  skills?: string | null;
  education?: string | null;
  currentCompany?: string | null;
  employmentHistory?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  applications: Array<{ referenceNo: string; status: string; requisition: { title: string } }>;
};

export default function SelectedEmployeePreview({ params }: { params: Promise<{ id: string }> }) {
  const [employee, setEmployee] = useState<Candidate | null>(null);
  const [message, setMessage] = useState("Loading employee details…");

  useEffect(() => {
    void (async () => {
      const { id } = await params;
      const response = await fetch(`/api/v1/candidates/${id}`);
      const result = await response.json();
      if (!response.ok) return setMessage(result.error?.message || "Could not load employee details");
      if (result.data.status !== "SELECTED") return setMessage("This record is no longer a selected employee");
      setEmployee(result.data);
      setMessage("");
    })();
  }, [params]);

  if (!employee) return <main className="page-shell"><section className="panel"><p role="status">{message}</p></section></main>;

  return <main className="page-shell"><section className="panel employee-preview-panel"><div className="candidate-profile-header"><div><p className="eyebrow">Employee profile</p><h1>{employee.firstName} {employee.lastName}</h1><p className="candidate-profile-meta">{employee.referenceNo} · {employee.status} · {employee.source}</p></div><span className="candidate-status-badge candidate-status-selected">Employee</span></div><h2>Personal details</h2><dl className="details"><dt>Email</dt><dd>{employee.email}</dd><dt>Phone</dt><dd>{employee.phone}</dd><dt>Position</dt><dd>{employee.roleOfInterest || "Not provided"}</dd><dt>Experience</dt><dd>{employee.experience || "Not provided"}</dd><dt>Skills</dt><dd>{employee.skills || "Not provided"}</dd><dt>Education</dt><dd>{employee.education || "Not provided"}</dd><dt>Current company</dt><dd>{employee.currentCompany || "Not provided"}</dd><dt>Employment history</dt><dd>{employee.employmentHistory || "Not provided"}</dd></dl><h2>Address</h2><dl className="details"><dt>Address</dt><dd>{[employee.addressLine1, employee.addressLine2].filter(Boolean).join(", ") || "Not provided"}</dd><dt>City</dt><dd>{employee.city || "Not provided"}</dd><dt>State</dt><dd>{employee.state || "Not provided"}</dd><dt>Postal code</dt><dd>{employee.postalCode || "Not provided"}</dd></dl><h2>Applications</h2><ul>{employee.applications.map((application) => <li key={application.referenceNo}>{application.referenceNo} · {application.requisition.title} · {application.status}</li>)}</ul></section></main>;
}
