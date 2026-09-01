"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type FormKind = "social" | "walk-in";
const experienceOptions = ["3-6 month", "1-5 year", "5-9 year", "10+"];
const questionOptions = [
  ["dateOfBirth", "Date of birth"],
  ["gender", "Gender"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["currentCompany", "Current company"],
  ["skills", "Skills"],
  ["ctc", "Current CTC"],
  ["hikePercentage", "Expected hike"],
  ["noticePeriod", "Notice period"],
  ["employmentHistory", "Employment history"],
  ["addressLine1", "Address"],
  ["howFound", "How did you hear about us?"],
  ["reasonForJobChange", "Reason for job change"],
  ["professionalReferenceName", "Professional reference"],
] as const;

export function CandidateFormShareLinks() {
  const [kind, setKind] = useState<FormKind>("social");
  const [manualPosition, setManualPosition] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [experienceRequired, setExperienceRequired] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(
    questionOptions.map(([value]) => value),
  );
  const [deployed, setDeployed] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [origin, setOrigin] = useState("https://triple-minds.local");

  useEffect(() => {
    setOrigin(window.location.origin);
    const savedConfig = window.localStorage.getItem("triple-minds-form-editor-social");
    if (savedConfig) {
      try {
        const value = JSON.parse(savedConfig) as { position?: string; description?: string; experience?: string; questions?: string[] };
        setManualPosition(value.position || "");
        setFormDescription(value.description || "");
        setExperienceRequired(value.experience || "");
        if (value.questions) setSelectedQuestions(value.questions);
      } catch {
        window.localStorage.removeItem("triple-minds-form-editor-social");
      }
    }
  }, []);

  const url = useMemo(() => {
    const value = new URL(kind === "social" ? "/apply" : "/walk-in", origin);
    if (manualPosition.trim()) value.searchParams.set("position", manualPosition.trim());
    if (kind === "social" && experienceRequired)
      value.searchParams.set("experienceRequired", experienceRequired);
    if (kind === "social" && formDescription.trim())
      value.searchParams.set("description", formDescription.trim());
    // Keep an empty fields value so the public form can distinguish
    // "no optional questions selected" from "use the default checklist".
    value.searchParams.set("fields", selectedQuestions.join(","));
    return value.toString();
  }, [
    kind,
    origin,
    manualPosition,
    experienceRequired,
    formDescription,
    selectedQuestions,
  ]);
  const qrUrl = `https://quickchart.io/qr?size=240&text=${encodeURIComponent(url)}`;
  function previewUrlFor(nextKind: FormKind) {
    const params = new URLSearchParams({ kind: nextKind, fields: selectedQuestions.join(",") });
    if (manualPosition.trim()) params.set("position", manualPosition.trim());
    if (nextKind === "social" && experienceRequired)
      params.set("experienceRequired", experienceRequired);
    if (nextKind === "social" && formDescription.trim())
      params.set("description", formDescription.trim());
    return `/hr/candidates/new/preview?${params.toString()}`;
  }
  const previewUrl = useMemo(
    () => previewUrlFor(kind),
    [kind, manualPosition, experienceRequired, formDescription, selectedQuestions],
  );

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Form URL copied.");
    } catch {
      setMessage("Copy was blocked by the browser. Select and copy the URL manually.");
    }
  }

  function selectKind(nextKind: FormKind) {
    setKind(nextKind);
    setDeployed(false);
    setSaved(false);
    setMessage("");
    const stored = window.localStorage.getItem(`triple-minds-form-editor-${nextKind}`);
    if (stored) {
      try {
        const value = JSON.parse(stored) as { position?: string; description?: string; experience?: string; questions?: string[] };
        setManualPosition(value.position || "");
        setFormDescription(value.description || "");
        setExperienceRequired(value.experience || "");
        setSelectedQuestions(value.questions || questionOptions.map(([value]) => value));
        setSaved(true);
      } catch {
        window.localStorage.removeItem(`triple-minds-form-editor-${nextKind}`);
      }
    }
  }

  function saveForm() {
    window.localStorage.setItem(`triple-minds-form-editor-${kind}`, JSON.stringify({
      position: manualPosition,
      description: kind === "social" ? formDescription : "",
      experience: experienceRequired,
      questions: selectedQuestions,
    }));
    setSaved(true);
    setMessage(`${kind === "social" ? "Social media" : "Walk-in"} form settings saved on this device.`);
  }

  function formatDescription(prefix: string, suffix = "") {
    const field = descriptionRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = formDescription.slice(start, end) || "your text";
    const next = `${formDescription.slice(0, start)}${prefix}${selected}${suffix}${formDescription.slice(end)}`;
    setFormDescription(next);
    setDeployed(false);
    setSaved(false);
    requestAnimationFrame(() => {
      field.focus();
      const selectionStart = start + prefix.length;
      field.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  }

  function addBullets() {
    const field = descriptionRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = formDescription.slice(start, end) || "First point\nSecond point";
    const bulleted = selected.split("\n").map((line) => `- ${line.replace(/^[-•]\s*/, "")}`).join("\n");
    setFormDescription(`${formDescription.slice(0, start)}${bulleted}${formDescription.slice(end)}`);
    setDeployed(false);
    setSaved(false);
    requestAnimationFrame(() => field.focus());
  }

  return (
    <section id="form-editor" className="form-share-panel" aria-labelledby="send-form-title">
      <div className="section-heading form-share-heading">
        <div>
          <p className="eyebrow">Send Form</p>
          <h2 id="send-form-title">Deploy a hiring form</h2>
          <p className="page-intro">
            Edit the form on the left, then make its link available to share.
          </p>
        </div>
      </div>
      <div className="form-editor-column">
        <div className="form-share-tabs" role="tablist" aria-label="Form type">
          <button
            id="form-editor-social"
            type="button"
            className={kind === "social" ? "is-active" : ""}
            onClick={() => selectKind("social")}
          >
            Social media form
          </button>
          <button
            id="form-editor-walk-in"
            type="button"
            className={kind === "walk-in" ? "is-active" : ""}
            onClick={() => selectKind("walk-in")}
          >
            Walk-in form
          </button>
        </div>
        <label className="form-editor-field"><span>Position</span><input value={manualPosition} onChange={(event) => { setManualPosition(event.target.value); setDeployed(false); setSaved(false); }} placeholder="e.g. Frontend Developer" /><small className="form-field-help">Enter the position for this hiring form.</small></label>
        {kind === "social" && (
          <div className="form-grid form-share-requirements">
            <label>
              <span>Experience required</span>
              <select
                value={experienceRequired}
                onChange={(event) => {
                  setExperienceRequired(event.target.value);
                  setDeployed(false);
                  setSaved(false);
                }}
              >
                <option value="">Any experience</option>
                {experienceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {kind === "social" && (
          <label className="form-editor-field">
            <span>Form description</span>
            <textarea
              ref={descriptionRef}
              value={formDescription}
              maxLength={2000}
              onChange={(event) => { setFormDescription(event.target.value); setDeployed(false); setSaved(false); }}
              placeholder="Tell candidates about the opportunity and what to expect."
              rows={4}
            />
            <div className="form-description-toolbar" aria-label="Description formatting">
              <button type="button" onClick={() => formatDescription("**", "**")} aria-label="Bold selected text"><strong>B</strong></button>
              <button type="button" onClick={() => formatDescription("*", "*")} aria-label="Italicize selected text"><em>I</em></button>
              <button type="button" onClick={addBullets} aria-label="Add bullet list">• List</button>
            </div>
            <small className="form-field-help">This description appears at the top of the social media application form.</small>
          </label>
        )}
        <fieldset className="form-question-editor">
          <legend>Questions to ask candidates</legend>
          <p>
            Select which additional questions should appear on the live form. Name, email, phone,
            and consent remain required.
          </p>
          <div>
            {questionOptions.map(([value, label]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={selectedQuestions.includes(value)}
                  onChange={(event) => {
                    setSelectedQuestions((current) =>
                      event.target.checked
                        ? [...current, value]
                        : current.filter((item) => item !== value),
                    );
                    setDeployed(false);
                    setSaved(false);
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          <button type="button" className="form-save-button" onClick={saveForm} disabled={saved}>
            Save form
          </button>
          {saved && <small className="form-field-help">Saved checklist will be restored when you reopen this form.</small>}
        </fieldset>
        <div className="form-deployment-actions mt-4" aria-label="Deploy form actions">
          <button
            type="button"
            className="premium-accent form-push-button"
            onClick={() => {
              setDeployed(true);
              setMessage(
                `${kind === "social" ? "Social media" : "Walk-in"} form deployed. It is ready to share.`,
              );
            }}
          >
            Deploy link
          </button>
          {deployed && (
            <button
              type="button"
              className="form-abort-button"
              onClick={() => {
                setDeployed(false);
                setMessage("The sharing link was aborted and removed from this deployment panel.");
              }}
            >
              Abort link
            </button>
          )}
        </div>
      </div>
      <div className="form-link-column">
        {deployed ? (
          <>
            <div className="form-share-url">
              <label>
                <span>Available link</span>
                <input aria-label="Hiring form URL" readOnly value={url} />
              </label>
              <button type="button" onClick={() => void copyUrl()}>
                Copy URL
              </button>
            </div>
            <div className="form-share-qr">
              <img src={qrUrl} alt="QR code for the selected hiring form" />
              <div>
                <strong>Live {kind === "social" ? "social media" : "walk-in"} form</strong>
                <p>Share this link or QR code with candidates.</p>
                <div className="form-link-actions">
                  <a href={previewUrl}>Preview form</a>
                  <a href={url} target="_blank" rel="noreferrer">
                    Open form in a new tab
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="form-link-empty">
            <strong>Available link</strong>
            <span>Deploy the selected form to generate a shareable link.</span>
          </div>
        )}
        <div className="form-link-kind-actions" aria-label="Preview form options">
          <Link className="form-preview-button" href={previewUrlFor("walk-in")}>
            Walked In Form
          </Link>
          <Link className="form-preview-button" href={previewUrlFor("social")}>
            Social Link
          </Link>
        </div>
      </div>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
