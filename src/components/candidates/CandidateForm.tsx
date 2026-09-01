"use client";

import { FormEvent, useState } from "react";

type Mode = "ONLINE" | "WALK_IN";
type DocumentInput = { kind: "RESUME" | "SUPPORTING"; objectKey: string; fileName: string; contentType: string; byteSize: number };
type EmploymentEntry = { employer: string; jobTitle: string; startDate: string; endDate: string; duties: string; reasonForLeaving: string };

const initialFields = { firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", gender: "", addressLine1: "", city: "", state: "", country: "", postalCode: "", education: "", tenthInstitution: "", tenthBoard: "", tenthPassingYear: "", tenthScore: "", twelfthInstitution: "", twelfthBoard: "", twelfthPassingYear: "", twelfthScore: "", collegeName: "", collegeDegree: "", collegePassingYear: "", collegeScore: "", employmentHistory: "", currentCompany: "", howFound: "", otherSource: "", referenceName: "", reasonForJobChange: "", professionalReference: "", professionalReferenceName: "", professionalReferenceProfile: "", professionalReferenceExperience: "", professionalReferenceContact: "", signatureName: "", acknowledgementDate: "", skills: "", expectedCompensation: "", ctc: "", hikePercentage: "", noticePeriod: "", roleOfInterest: "", experience: "", requisitionId: "", visitDate: "", visitPurpose: "" };
function normalizeFormFields(value: Partial<typeof initialFields>) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key in initialFields).map(([key, fieldValue]) => [key, fieldValue ?? ""])) as Partial<typeof initialFields>;
}
const educationKeys = ["tenthInstitution", "tenthBoard", "tenthPassingYear", "tenthScore", "twelfthInstitution", "twelfthBoard", "twelfthPassingYear", "twelfthScore", "collegeName", "collegeDegree", "collegePassingYear", "collegeScore"] as const;
function serializeEducation(value: Partial<typeof initialFields>) {
  const details = Object.fromEntries(educationKeys.map((key) => [key, value[key] || ""]));
  return Object.values(details).some(Boolean) ? JSON.stringify(details) : value.education || "";
}
function expandEducation(value: Partial<typeof initialFields>) {
  if (!value.education) return value;
  try {
    const details = JSON.parse(value.education);
    if (!details || typeof details !== "object" || Array.isArray(details)) return value;
    return { ...value, ...normalizeFormFields(details as Partial<typeof initialFields>) };
  } catch {
    return value;
  }
}
const emptyEmploymentEntry = (): EmploymentEntry => ({ employer: "", jobTitle: "", startDate: "", endDate: "", duties: "", reasonForLeaving: "" });
function parseEmploymentHistory(value: string) {
  if (!value) return [emptyEmploymentEntry()];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [emptyEmploymentEntry()];
    const entries = parsed.filter((entry) => entry && typeof entry === "object").map((entry) => ({ ...emptyEmploymentEntry(), ...entry })) as EmploymentEntry[];
    return entries.length ? entries : [emptyEmploymentEntry()];
  } catch {
    return [{ ...emptyEmploymentEntry(), duties: value }];
  }
}
function serializeEmploymentHistory(entries: EmploymentEntry[]) {
  const filled = entries.filter((entry) => Object.values(entry).some(Boolean));
  return filled.length ? JSON.stringify(filled) : "";
}
const experienceOptions = ["3-6 month", "1-5 year", "5-9 year", "10+"];
const genderOptions = ["Male", "Female", "Other"];
const howFoundOptions = ["LinkedIn Post", "Company Website", "Job Portal", "Reference", "Social Media", "Other"];
const educationFields = ["tenthInstitution", "tenthBoard", "tenthPassingYear", "tenthScore", "twelfthInstitution", "twelfthBoard", "twelfthPassingYear", "twelfthScore", "collegeName", "collegeDegree", "collegePassingYear", "collegeScore"] as const;
const walkInFields = new Set(["firstName", "lastName", "email", "phone", "dateOfBirth", "gender", "hikePercentage", "ctc", "experience", "education", ...educationFields, "currentCompany", "howFound", "otherSource", "referenceName", "reasonForJobChange", "noticePeriod", "professionalReferenceName", "professionalReferenceProfile", "professionalReferenceExperience", "professionalReferenceContact", "signatureName", "acknowledgementDate", "skills", "addressLine1", "city", "state"]);
const requiredFormFields = new Set(["email", "phone", "firstName", "lastName"]);
const states = ["Andhra Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
const citiesByState: Record<string, string[]> = { Delhi: ["New Delhi", "Delhi"], Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala"], Punjab: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"], Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"], Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"], Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"], Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota"], "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur", "Agra", "Varanasi"], Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode"], "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"], Telangana: ["Hyderabad", "Warangal"], "West Bengal": ["Kolkata", "Howrah", "Durgapur"], Bihar: ["Patna", "Gaya", "Muzaffarpur"], Odisha: ["Bhubaneswar", "Cuttack", "Rourkela"], Goa: ["Panaji", "Vasco da Gama"] };
const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tensWords = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function amountInWords(value: string) {
  const amount = Math.floor(Number(value.replace(/,/g, "")));
  if (!Number.isFinite(amount) || amount < 0) return "";
  if (amount === 0) return "zero rupees";
  const belowThousand = (number: number): string => { if (number < 20) return numberWords[number]; if (number < 100) return `${tensWords[Math.floor(number / 10)]}${number % 10 ? ` ${numberWords[number % 10]}` : ""}`; return `${numberWords[Math.floor(number / 100)]} hundred${number % 100 ? ` ${belowThousand(number % 100)}` : ""}`; };
  let remaining = amount;
  const parts: string[] = [];
  const crore = Math.floor(remaining / 10000000); remaining %= 10000000;
  const lakh = Math.floor(remaining / 100000); remaining %= 100000;
  const thousand = Math.floor(remaining / 1000); remaining %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} thousand`);
  if (remaining) parts.push(belowThousand(remaining));
  return `${parts.join(" ")} rupees`;
}

export function CandidateForm({ mode, organizationSlug, organizationId, requisitionId, position, requisitions = [], publicWalkIn = false, formRequirements, formFields, context = "public", showInterviewDetails = mode === "WALK_IN" }: { mode: Mode; organizationSlug?: string; organizationId?: string; requisitionId?: string; position?: string; requisitions?: Array<{ id: string; referenceNo: string; title: string }>; publicWalkIn?: boolean; formRequirements?: { experience?: string; skills?: string }; formFields?: string[]; context?: "public" | "hr-preview"; showInterviewDetails?: boolean }) {
  const [fields, setFields] = useState({ ...initialFields, experience: formRequirements?.experience || "", skills: formRequirements?.skills || "", roleOfInterest: position || "", requisitionId: requisitionId || "" });
  const [employmentEntries, setEmploymentEntries] = useState<EmploymentEntry[]>([emptyEmploymentEntry()]);
  const [documents, setDocuments] = useState<DocumentInput[]>([]);
  const [message, setMessage] = useState("");
  const [submittedReference, setSubmittedReference] = useState("");
  const [duplicateSubmission, setDuplicateSubmission] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);
  function update(name: keyof typeof initialFields, value: string) {
    if (name === "email" || name === "phone") setDuplicateSubmission(false);
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function getCurrentLocation() {
    if (!navigator.geolocation) return setMessage("GPS location is not available in this browser. Please enter your address manually.");
    setAddressBusy(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 }));
      const response = await fetch("/api/v1/address/postal-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Current address lookup is unavailable.");
      if (!result.data.found) return setMessage("Your current address could not be found. Please enter it manually.");
      const location = result.data.locations?.[0] || result.data;
      setFields((current) => ({
        ...current,
        addressLine1: location.formattedAddress || current.addressLine1,
        city: location.city || current.city,
        state: location.state || current.state,
      }));
      setMessage("Current location added. Please review the address before submitting.");
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: number }).code) : 0;
      setMessage(code === 1 ? "Location permission was denied. Please enter your address manually." : code === 3 ? "GPS lookup timed out. Please try again or enter your address manually." : error instanceof Error ? error.message : "Current address lookup is unavailable.");
    } finally {
      setAddressBusy(false);
    }
  }

  async function lookupCandidate(identifier = fields.email || fields.phone, formRequisitionId = fields.requisitionId || requisitionId) {
    if (context === "hr-preview") return;
    if (!identifier) return;
    const source = mode === "WALK_IN" ? "WALK_IN" : "ONLINE";
    const params = new URLSearchParams({ identifier, source });
    if (formRequisitionId) params.set("requisitionId", formRequisitionId);
    const matchEndpoint = publicWalkIn || mode === "ONLINE" ? `/api/v1/public/candidates/match?organizationSlug=${encodeURIComponent(organizationSlug || "")}&${params.toString()}` : `/api/v1/candidates/match?${params.toString()}`;
    let response: Response;
    try { response = await fetch(matchEndpoint, { headers: !publicWalkIn && organizationId ? { "x-organization-id": organizationId } : undefined }); } catch { throw new Error("Candidate lookup is unavailable. Please continue entering the form manually."); }
    if (response.status === 404) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Could not look up candidate");
    const candidate = result.data;
    const normalizedCandidate = expandEducation(normalizeFormFields(candidate as Partial<typeof initialFields>));
    setDuplicateSubmission(Boolean(candidate.duplicateSubmission));
    setFields((current) => ({ ...current, ...normalizedCandidate, requisitionId: current.requisitionId, visitDate: current.visitDate, visitPurpose: current.visitPurpose }));
    setEmploymentEntries(parseEmploymentHistory(normalizedCandidate.employmentHistory || ""));
    setMessage(candidate.duplicateSubmission ? `This ${mode === "WALK_IN" ? "walk-in" : "social"} form was already submitted for ${candidate.firstName}. The form is locked to prevent a duplicate.` : `Welcome back, ${candidate.firstName}. Existing candidate ${candidate.referenceNo} was found and prefilled.`);
  }

  async function upload(file: File, kind: DocumentInput["kind"]) {
    const isPublic = context !== "hr-preview" && (mode === "ONLINE" || publicWalkIn);
    const uploadEndpoint = isPublic ? "/api/v1/public/candidates/upload-url" : "/api/v1/candidates/upload-url";
    const body = { kind, fileName: file.name, contentType: file.type || "text/plain", byteSize: file.size, ...(isPublic ? { organizationSlug } : {}) };
    let response: Response;
    try { response = await fetch(uploadEndpoint, { method: "POST", headers: { "content-type": "application/json", ...(!isPublic && organizationId ? { "x-organization-id": organizationId } : {}) }, body: JSON.stringify(body) }); } catch { throw new Error("Document upload service is unavailable. Please try again when storage is online."); }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Could not prepare document upload");
    let put: Response;
    try { put = await fetch(result.data.uploadUrl, { method: "PUT", headers: { "content-type": file.type || "text/plain" }, body: file }); } catch { throw new Error("Document storage is unavailable. Please try again when storage is online."); }
    if (!put.ok) throw new Error("Could not upload document");
    setDocuments((current) => [...current, { kind, objectKey: result.data.objectKey, fileName: file.name, contentType: file.type || "text/plain", byteSize: file.size }]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (duplicateSubmission) {
      setMessage("This form has already been submitted for this candidate.");
      return;
    }
    if (!documents.some((document) => document.kind === "RESUME")) {
      setMessage("Please upload your resume/CV successfully before submitting the form.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const isPublic = context !== "hr-preview" && (mode === "ONLINE" || publicWalkIn);
      const endpoint = isPublic ? (publicWalkIn ? "/api/v1/public/walk-in-candidates" : "/api/v1/public/candidates") : "/api/v1/candidates";
      const source = mode === "WALK_IN" ? "WALK_IN" : "ONLINE";
      const body = { ...fields, education: serializeEducation(fields), employmentHistory: serializeEmploymentHistory(employmentEntries), visitDate: fields.visitDate ? new Date(fields.visitDate).toISOString() : undefined, documents, declarationAccepted: true, consentAccepted: true, ...(isPublic ? { organizationSlug, source } : { source }) };
      let response: Response;
      try { response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", ...(!isPublic && organizationId ? { "x-organization-id": organizationId } : {}) }, body: JSON.stringify(body) }); } catch { throw new Error("The form could not reach the hiring service. Check the connection and try again."); }
      const result = await response.json();
      if (!response.ok) {
        let errStr = result.error?.message || "Submission failed";
        if (result.error?.details?.fieldErrors) {
          const fieldMsgs = Object.entries(result.error.details.fieldErrors)
            .map(([f, errs]) => `${f}: ${Array.isArray(errs) ? errs.join(", ") : errs}`)
            .join("; ");
          if (fieldMsgs) errStr = `Validation error — ${fieldMsgs}`;
        }
        throw new Error(errStr);
      }
      setSubmittedReference(result.data.referenceNo);
      setMessage(`Submission received. Reference: ${result.data.referenceNo}`);
      setFields({ ...initialFields, requisitionId: requisitionId || "" });
      setDocuments([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  const defaultFieldOrder = ["email", "phone", "firstName", "lastName", "dateOfBirth", "gender", "hikePercentage", "ctc", "experience", ...educationFields, "currentCompany", "howFound", "otherSource", "referenceName", "reasonForJobChange", "professionalReferenceName", "professionalReferenceProfile", "professionalReferenceExperience", "professionalReferenceContact", "signatureName", "acknowledgementDate", "skills", "noticePeriod", "addressLine1", "city", "state"] as Array<keyof typeof initialFields>;
  const configuredFields = formFields?.flatMap((name) => name === "education" ? educationFields : [name as keyof typeof initialFields]);
  const fieldOrder = (configuredFields ? [...requiredFormFields, ...configuredFields.filter((name) => name !== "employmentHistory")] : defaultFieldOrder) as Array<keyof typeof initialFields>;
  const showEmploymentHistory = !formFields || formFields.includes("employmentHistory");

  return submittedReference ? (
    <section className="candidate-submission-confirmation" role="status" aria-live="polite">
      <p className="eyebrow">Application received</p>
      <h2>Thank you for applying.</h2>
      <p>Your details have been submitted securely to the Triple Minds HR team.</p>
      <p><strong>Reference:</strong> {submittedReference}</p>
    </section>
  ) : (
    <form className={`candidate-form${duplicateSubmission ? " is-duplicate" : ""}`} onSubmit={submit} aria-disabled={duplicateSubmission} autoComplete="off">
      <fieldset disabled={duplicateSubmission}>
      {context === "hr-preview" && <div className="form-preview-banner" role="status"><strong>HR Preview · Review mode</strong><span>This is the same form candidates will complete. Submitting here saves an authenticated candidate application for your organization.</span></div>}
      <div className="form-grid">
        {(position || !publicWalkIn) && <label className="candidate-position-field"><span>Position applied for</span>{position ? <input readOnly value={position} aria-label="Position applied for" /> : <select required value={fields.requisitionId} onChange={(event) => { update("requisitionId", event.target.value); if (fields.email || fields.phone) void lookupCandidate(fields.email || fields.phone, event.target.value).catch((error) => setMessage(error.message)); }}><option value="">Select a published position</option>{requisitions.map((requisition) => <option key={requisition.id} value={requisition.id}>{requisition.title} · {requisition.referenceNo}</option>)}</select>}</label>}
        {fieldOrder.filter((name, index, current) => current.indexOf(name) === index).filter((name) => name !== "country" && name !== "postalCode").filter((name) => mode !== "WALK_IN" || walkInFields.has(name)).filter((name) => name !== "otherSource" || fields.howFound === "Other").filter((name) => name !== "referenceName" || fields.howFound === "Reference").map((name) => (
          <div className="candidate-form-field" key={name}>
            {name === "email" && <h2 className="form-section-heading">Personal details</h2>}
            {name === "hikePercentage" && <h2 className="form-section-heading">Professional details</h2>}
            {name === "tenthInstitution" && <h2 className="form-section-heading">Education details</h2>}
            {name === "twelfthInstitution" && <h3 className="form-subsection-heading">12th / Higher secondary</h3>}
            {name === "collegeName" && <h3 className="form-subsection-heading">College / graduation</h3>}
            {name === "howFound" && <h2 className="form-section-heading">Application source</h2>}
            {name === "professionalReferenceName" && <h2 className="form-section-heading">Professional reference</h2>}
            {name === "signatureName" && <h2 className="form-section-heading">Declaration</h2>}
            {name === "addressLine1" && <h2 className="form-section-heading">Address details</h2>}
          <label>
            <span>{name === "phone" ? "Mobile number" : name === "dateOfBirth" ? "Date of birth" : name === "hikePercentage" ? "Expected hike (%)" : name === "ctc" ? "Last/current salary (CTC)" : name === "experience" ? "Total experience" : name === "currentCompany" ? "Current / last company" : name === "howFound" ? "How did you find Triple Minds?" : name === "otherSource" ? "Other source" : name === "referenceName" ? "Referral contact name" : name === "reasonForJobChange" ? "Reason for job change" : name === "professionalReferenceName" ? "Professional reference name" : name === "professionalReferenceProfile" ? "Professional reference profile" : name === "professionalReferenceExperience" ? "Professional reference experience" : name === "professionalReferenceContact" ? "Professional reference contact number" : name === "signatureName" ? "Candidate signature" : name === "acknowledgementDate" ? "Acknowledgement date" : name === "tenthInstitution" ? "10th school / institution" : name === "tenthBoard" ? "10th board" : name === "tenthPassingYear" ? "10th passing year" : name === "tenthScore" ? "10th percentage / CGPA" : name === "twelfthInstitution" ? "12th school / institution" : name === "twelfthBoard" ? "12th board" : name === "twelfthPassingYear" ? "12th passing year" : name === "twelfthScore" ? "12th percentage / CGPA" : name === "collegeName" ? "College / university" : name === "collegeDegree" ? "Degree / course" : name === "collegePassingYear" ? "College passing year" : name === "collegeScore" ? "College percentage / CGPA" : name.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}</span>
            {publicWalkIn && name === "state" ? <select required value={fields.state} onChange={(event) => { update("state", event.target.value); update("city", ""); }}><option value="">Select state</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select> : publicWalkIn && name === "city" ? <select required value={fields.city} onChange={(event) => update("city", event.target.value)}><option value="">Select city</option>{(citiesByState[fields.state] || []).map((city) => <option key={city} value={city}>{city}</option>)}</select> : name === "experience" ? <select required value={fields.experience} onChange={(event) => update("experience", event.target.value)}><option value="">Select experience</option>{experienceOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select> : name === "gender" ? <select value={fields.gender} onChange={(event) => update("gender", event.target.value)}><option value="">Select gender</option>{genderOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select> : name === "howFound" ? <select value={fields.howFound} onChange={(event) => update("howFound", event.target.value)}><option value="">Select an option</option>{howFoundOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select> : name === "dateOfBirth" || name === "acknowledgementDate" ? <input type="date" value={fields[name]} onChange={(event) => update(name, event.target.value)} /> : <><input required={["firstName", "lastName", "email", "phone"].includes(name)} inputMode={name === "hikePercentage" || name === "ctc" ? "decimal" : undefined} type={name === "email" ? "email" : name === "hikePercentage" || name === "ctc" ? "number" : "text"} min={name === "hikePercentage" ? "0" : undefined} max={name === "hikePercentage" ? "100" : undefined} step={name === "hikePercentage" ? "0.01" : undefined} value={fields[name]} onBlur={() => { if (name === "email" || name === "phone") void lookupCandidate(fields[name]).catch((error) => setMessage(error.message)); }} onChange={(event) => update(name, event.target.value)} />{name === "hikePercentage" && fields.hikePercentage && <small className="field-hint">{fields.hikePercentage}%</small>}{name === "ctc" && fields.ctc && <small className="field-hint">{amountInWords(fields.ctc)}</small>}</>}
          </label>
          </div>
        ))}
        {(!formFields || formFields.includes("addressLine1")) && <button className="location-button" type="button" disabled={addressBusy} onClick={() => void getCurrentLocation()}>{addressBusy ? "Getting current location…" : "Use my current location"}</button>}
        {showInterviewDetails && <><h2 className="form-section-heading">Interview details</h2><label> <span>Interview date</span><input required type="datetime-local" value={fields.visitDate} onChange={(event) => update("visitDate", event.target.value)} /></label><label><span>Visit purpose</span><textarea value={fields.visitPurpose} onChange={(event) => update("visitPurpose", event.target.value)} /></label></>}
      </div>
      {showEmploymentHistory && <section className="employment-history-editor" aria-labelledby="employment-history-heading"><h2 id="employment-history-heading" className="form-section-heading">Employment history</h2><p className="form-field-help">Start with the most recent employer. Add another entry for each previous role.</p>{employmentEntries.map((entry, index) => <fieldset className="employment-entry" key={index}><legend>Employment {index + 1}</legend><label><span>Employer name</span><input value={entry.employer} onChange={(event) => setEmploymentEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, employer: event.target.value } : item))} /></label><label><span>Job title / position</span><input value={entry.jobTitle} onChange={(event) => setEmploymentEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, jobTitle: event.target.value } : item))} /></label><label><span>Start date</span><input type="month" value={entry.startDate} onChange={(event) => setEmploymentEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startDate: event.target.value } : item))} /></label><label><span>End date</span><input type="month" value={entry.endDate} onChange={(event) => setEmploymentEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, endDate: event.target.value } : item))} /></label><label className="employment-entry-wide"><span>Duties and responsibilities</span><textarea rows={3} value={entry.duties} onChange={(event) => setEmploymentEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, duties: event.target.value } : item))} /></label><label className="employment-entry-wide"><span>Reason for leaving</span><textarea rows={2} value={entry.reasonForLeaving} onChange={(event) => setEmploymentEntries((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, reasonForLeaving: event.target.value } : item))} /></label>{employmentEntries.length > 1 && <button type="button" className="employment-remove-button" onClick={() => setEmploymentEntries((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove employment</button>}</fieldset>)}<button type="button" className="employment-add-button" onClick={() => setEmploymentEntries((current) => [...current, emptyEmploymentEntry()])}>Add another employment</button></section>}
      <h2 className="form-section-heading">Documents</h2>
      <label><span>Resume/CV</span><input required type="file" accept=".pdf,.doc,.docx,.txt" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, "RESUME").catch((error) => setMessage(error.message)); }} /></label>
      <label><span>Supporting documents</span><input type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={(event) => { for (const file of Array.from(event.target.files || [])) void upload(file, "SUPPORTING").catch((error) => setMessage(error.message)); }} /></label>
      <label className="checkbox"><input required type="checkbox" /> I confirm the declaration and consent to processing of this application.</label>
      <button disabled={busy} type="submit">{busy ? "Submitting…" : context === "hr-preview" ? "Submit application" : mode === "ONLINE" ? "Submit application" : "Save walk-in candidate"}</button>
      </fieldset>
      {message && <p role="status" className="form-message">{message}</p>}
      {duplicateSubmission && <div className="duplicate-form-modal" role="alert"><strong>Form already submitted</strong><span>This candidate has already completed this form using the same email or phone number.</span><button type="button" onClick={() => setDuplicateSubmission(false)}>Edit identifier</button></div>}
    </form>
  );
}
