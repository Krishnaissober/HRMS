"use client";

import { useEffect, useState } from "react";

const labels: Record<string, string> = {
  dateOfBirth: "Date of birth",
  gender: "Gender",
  addressLine1: "Address",
  city: "City",
  state: "State",
  postalCode: "Postal code",
  education: "Education",
  tenthInstitution: "10th school / institution",
  tenthBoard: "10th board",
  tenthPassingYear: "10th passing year",
  tenthScore: "10th percentage / CGPA",
  twelfthInstitution: "12th school / institution",
  twelfthBoard: "12th board",
  twelfthPassingYear: "12th passing year",
  twelfthScore: "12th percentage / CGPA",
  collegeName: "College / university",
  collegeDegree: "Degree / course",
  collegePassingYear: "College passing year",
  collegeScore: "College percentage / CGPA",
  employmentHistory: "Employment history",
  currentCompany: "Current / last company",
  howFound: "How did you find Triple Minds?",
  reasonForJobChange: "Reason for job change",
  skills: "Skills",
  ctc: "Current CTC",
  hikePercentage: "Expected hike (%)",
  noticePeriod: "Notice period",
  aadhaarNumber: "Aadhaar number",
  panNumber: "PAN number",
  aadhaarImage: "Aadhaar card image",
  panImage: "PAN card image",
};
type Document = {
  kind: "AADHAAR_IMAGE" | "PAN_IMAGE";
  objectKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
};

function formatPan(value: string) {
  const clean = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  let result = "";
  for (let index = 0; index < clean.length; index += 1) {
    const expected = index < 5 || index === 9 ? /[A-Z]/ : /[0-9]/;
    if (expected.test(clean[index])) result += clean[index];
  }
  return result;
}

export default function CandidateCompletionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState("");
  const [candidate, setCandidate] = useState<{ firstName: string; lastName: string } | null>(null);
  const [requestedFields, setRequestedFields] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [message, setMessage] = useState("Loading secure completion form…");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    void (async () => {
      const { token: value } = await params;
      setToken(value);
      const response = await fetch(
        `/api/v1/public/candidate-completion?token=${encodeURIComponent(value)}`,
      );
      const result = await response.json();
      if (!response.ok)
        return setMessage(result.error?.message || "This completion link is unavailable.");
      setCandidate(result.data.candidate);
      setRequestedFields(result.data.requestedFields);
      setMessage("");
    })();
  }, [params]);
  async function addFile(kind: Document["kind"], file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("token", token);
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch("/api/v1/public/candidate-completion/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || "Could not upload identity document");
      setDocuments((current) => [
        ...current.filter((item) => item.kind !== kind),
        {
          kind,
          objectKey: result.data.objectKey,
          fileName: result.data.fileName,
          contentType: result.data.contentType,
          byteSize: result.data.byteSize,
        },
      ]);
      setMessage(`${labels[kind === "AADHAAR_IMAGE" ? "aadhaarImage" : "panImage"]} uploaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/v1/public/candidate-completion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, fields, documents, consent }),
      });
      const result = await response.json();
      if (!response.ok) {
        const details = result.error?.details;
        const errors = details?.fieldErrors
          ? Object.values(details.fieldErrors).flat()
          : details && typeof details === "object"
            ? Object.values(details).flat()
            : [];
        throw new Error(errors.join(" ") || result.error?.message || "Could not save details");
      }
      setMessage("Details submitted successfully. HR can now review them.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save details");
    } finally {
      setBusy(false);
    }
  }
  if (!candidate)
    return (
      <main className="page-shell">
        <section className="panel">
          <p role="status">{message}</p>
        </section>
      </main>
    );
  return (
    <main className="page-shell">
      <section className="panel completion-form">
        <p className="eyebrow">Triple Minds HR</p>
        <h1>Complete your details</h1>
        <p className="page-intro">
          Hello {candidate.firstName} {candidate.lastName}. Please provide only the missing
          information requested by HR.
        </p>
        <p className="sensitive-data-note">
          Aadhaar and PAN information is sensitive. Submit it only through this secure link. It will
          be protected and visible only to authorized HR users.
        </p>
        <form onSubmit={submit}>
          <div className="form-grid">
            {requestedFields
              .filter((field) => !["aadhaarImage", "panImage", "gender"].includes(field))
              .map((field) => (
                <label key={field}>
                  <span>{labels[field] || field}</span>
                  <input
                    required
                    type={field === "dateOfBirth" ? "date" : "text"}
                    value={fields[field] || ""}
                    maxLength={
                      field === "aadhaarNumber" ? 12 : field === "panNumber" ? 10 : undefined
                    }
                    pattern={
                      field === "aadhaarNumber"
                        ? "[0-9]{12}"
                        : field === "panNumber"
                          ? "[A-Z]{5}[0-9]{4}[A-Z]"
                          : undefined
                    }
                    title={
                      field === "aadhaarNumber"
                        ? "Enter exactly 12 digits"
                        : field === "panNumber"
                          ? "Enter PAN as 5 letters, 4 digits, and 1 letter"
                          : undefined
                    }
                    onChange={(event) =>
                      setFields((current) => ({
                        ...current,
                        [field]:
                          field === "aadhaarNumber"
                            ? event.target.value.replace(/\\D/g, "").slice(0, 12)
                            : field === "panNumber"
                              ? formatPan(event.target.value)
                              : event.target.value,
                      }))
                    }
                    inputMode={
                      field === "aadhaarNumber"
                        ? "numeric"
                        : field === "panNumber"
                          ? "text"
                          : undefined
                    }
                  />
                </label>
              ))}
            {requestedFields.includes("gender") && (
              <fieldset className="completion-radio-group">
                <legend>Gender</legend>
                {["Male", "Female", "Other"].map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={fields.gender === option}
                      onChange={(event) =>
                        setFields((current) => ({ ...current, gender: event.target.value }))
                      }
                      required
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            )}
            {requestedFields.includes("aadhaarImage") && (
              <label>
                <span>{labels.aadhaarImage}</span>
                <input
                  required
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(event) => void addFile("AADHAAR_IMAGE", event.target.files?.[0])}
                />
              </label>
            )}
            {requestedFields.includes("panImage") && (
              <label>
                <span>{labels.panImage}</span>
                <input
                  required
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(event) => void addFile("PAN_IMAGE", event.target.files?.[0])}
                />
              </label>
            )}
          </div>
          <label className="completion-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            I consent to Triple Minds HR collecting and securely processing the identity information
            submitted through this link.
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Submit details"}
          </button>
        </form>
        {message && (
          <p role="status" className="form-message">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
