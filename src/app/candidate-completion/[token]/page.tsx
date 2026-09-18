"use client";

import { BrandLogo } from "@/components/layout/brand-logo";

import { useEffect, useState } from "react";

const labels: Record<string, string> = {
  dateOfBirth: "Date of birth",
  gender: "Gender",
  addressLine1: "Address",
  city: "City",
  state: "State",
  postalCode: "Postal code",
  education: "Education",
  employmentHistory: "Employment history",
  currentCompany: "Current / last company",
  howFound: "How did you find Triple Minds?",
  reasonForJobChange: "Reason for job change",
  skills: "Skills",
  ctc: "Current CTC",
  hikePercentage: "Expected hike (%)",
  noticePeriod: "Notice period",
  bankAccountName: "Account holder name",
  bankName: "Bank name",
  bankBranchName: "Branch name",
  bankAccountNumber: "Account number",
  bankIfscCode: "IFSC code",
  bankAccountType: "Account type",
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
  const [candidate, setCandidate] = useState<{
    firstName: string;
    lastName: string;
    roleOfInterest?: string;
  } | null>(null);
  const [requestedFields, setRequestedFields] = useState<string[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [completedDocuments, setCompletedDocuments] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [message, setMessage] = useState("Loading secure onboarding form…");
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
        return setMessage(result.error?.message || "This onboarding link is unavailable.");
      setCandidate(result.data.candidate);
      setRequestedFields(result.data.requestedFields);
      setFields(result.data.values || {});
      setCompletedDocuments(result.data.completedDocuments || []);
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
      setCompletedDocuments((current) => current.filter((item) => item !== kind));
      setMessage(`${labels[kind === "AADHAAR_IMAGE" ? "aadhaarImage" : "panImage"]} uploaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function save(finalize: boolean) {
    setBusy(true);
    setMessage(finalize ? "Submitting your onboarding details…" : "Saving your progress…");
    try {
      const response = await fetch("/api/v1/public/candidate-completion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, fields, documents, consent, finalize }),
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
      setMessage(
        finalize
          ? "Onboarding details submitted successfully. HR can now verify them."
          : "Progress saved. You can safely return to this link later.",
      );
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
        <div className="mb-6"><BrandLogo /></div>
        <p className="eyebrow">Triple Minds HR · Candidate onboarding</p>
        <h1>Complete your onboarding details</h1>
        <p className="page-intro">
          Hello {candidate.firstName} {candidate.lastName}. HR is preparing your onboarding for{" "}
          <strong>{candidate.roleOfInterest || "your selected position"}</strong>. Only the missing
          information requested by HR is shown here.
        </p>
        <p className="sensitive-data-note">
          You can save your progress and return later. Aadhaar, PAN, and banking information is
          protected and shared only with authorized HR users.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(true);
          }}
        >
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
                    onChange={(event) =>
                      setFields((current) => ({
                        ...current,
                        [field]:
                          field === "aadhaarNumber"
                            ? event.target.value.replace(/\D/g, "").slice(0, 12)
                            : field === "panNumber"
                              ? formatPan(event.target.value)
                              : event.target.value,
                      }))
                    }
                    inputMode={field === "aadhaarNumber" ? "numeric" : undefined}
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
                  required={!completedDocuments.includes("AADHAAR_IMAGE")}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(event) => void addFile("AADHAAR_IMAGE", event.target.files?.[0])}
                />
                {completedDocuments.includes("AADHAAR_IMAGE") && <small>Already received</small>}
              </label>
            )}
            {requestedFields.includes("panImage") && (
              <label>
                <span>{labels.panImage}</span>
                <input
                  required={!completedDocuments.includes("PAN_IMAGE")}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(event) => void addFile("PAN_IMAGE", event.target.files?.[0])}
                />
                {completedDocuments.includes("PAN_IMAGE") && <small>Already received</small>}
              </label>
            )}
          </div>
          <label className="completion-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            I consent to Triple Minds HR collecting and securely processing the information
            submitted through this onboarding link.
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void save(false)}>
              {busy ? "Saving…" : "Save progress"}
            </button>
            <button type="submit" disabled={busy || !consent}>
              {busy ? "Submitting…" : "Submit onboarding details"}
            </button>
          </div>
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
