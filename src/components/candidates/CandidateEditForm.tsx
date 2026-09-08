"use client";

import { useState } from "react";

type EditableCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleOfInterest: string;
  experience?: string | null;
  skills?: string | null;
  currentCompany?: string | null;
  education?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  noticePeriod?: string | null;
  expectedCompensation?: string | null;
  ctc?: string | null;
  hikePercentage?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankBranchName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankAccountType?: string | null;
};

const fields = [
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["dateOfBirth", "Date of birth"],
  ["gender", "Gender"],
  ["roleOfInterest", "Role of interest"],
  ["experience", "Experience"],
  ["skills", "Skills"],
  ["currentCompany", "Current / last company"],
  ["education", "Education"],
  ["noticePeriod", "Notice period"],
  ["ctc", "Current CTC"],
  ["hikePercentage", "Expected hike (%)"],
  ["expectedCompensation", "Expected CTC"],
  ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"],
  ["bankAccountName", "Account holder name"],
  ["bankName", "Bank name"],
  ["bankBranchName", "Branch name"],
  ["bankAccountNumber", "Account number"],
  ["bankIfscCode", "IFSC code"],
  ["bankAccountType", "Account type"],
  ["city", "City"],
  ["state", "State"],
  ["country", "Country"],
  ["postalCode", "Postal code"],
] as const;

export function CandidateEditForm({
  candidate,
  onSaved,
  onCancel,
  onMessage,
}: {
  candidate: EditableCandidate;
  onSaved: (candidate: EditableCandidate) => void;
  onCancel: () => void;
  onMessage: (message: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map(([key]) => [key, String(candidate[key as keyof EditableCandidate] || "")]),
    ),
  );
  const [saving, setSaving] = useState(false);
  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/candidates/${encodeURIComponent(candidate.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || "Could not save candidate details");
      onSaved({ ...candidate, ...result.data });
      onMessage("Candidate details updated successfully.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Could not save candidate details");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="candidate-edit-form" onSubmit={save}>
      <p className="candidate-financial-help">
        Bank details are used for salary and statutory payroll processing. Use an active account in
        the candidate&apos;s name. Never enter a PIN, CVV, OTP, password, or card number.
      </p>
      <div className="candidate-edit-grid">
        {fields.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            {key === "bankAccountType" ? (
              <select value={values[key]} onChange={(event) => update(key, event.target.value)}>
                <option value="">Select account type</option>
                <option value="SAVINGS">Savings</option>
                <option value="CURRENT">Current</option>
              </select>
            ) : (
              <input
                required={["firstName", "lastName", "email", "phone", "roleOfInterest"].includes(
                  key,
                )}
                type={key === "email" ? "email" : key === "dateOfBirth" ? "date" : "text"}
                maxLength={key === "bankIfscCode" ? 11 : undefined}
                value={values[key]}
                onChange={(event) => update(key, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      <div className="candidate-edit-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="candidate-edit-cancel"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
