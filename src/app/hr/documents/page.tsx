"use client";
import { useEffect, useState } from "react";
import { backendFetch } from "@/lib/backend";
type Doc = {
  id: string;
  title: string;
  documentType: string;
  ownerType: string;
  ownerId: string;
  status: string;
  expiresAt: string | null;
  currentVersionNumber: number;
};
type CandidateDoc = {
  id: string;
  kind: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  createdAt: string;
  candidate: { id: string; referenceNo: string; firstName: string; lastName: string; email: string };
};
type CandidateSubmission = {
  id: string;
  referenceNo: string;
  source: string;
  submittedAt: string;
  candidate: { id: string; referenceNo: string; firstName: string; lastName: string; email: string };
};
export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [candidateDocs, setCandidateDocs] = useState<CandidateDoc[]>([]);
  const [candidateSubmissions, setCandidateSubmissions] = useState<CandidateSubmission[]>([]);
  const [msg, setMsg] = useState("");
  const [ownerType, setOwnerType] = useState<"EMPLOYEE" | "CANDIDATE">("EMPLOYEE");
  const [ownerId, setOwnerId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  async function load() {
    const r = await fetch("/api/v1/documents?page=1&pageSize=100"),
      j = await r.json();
    const candidateResponse = await fetch("/api/v1/candidate-documents");
    const candidateBody = await candidateResponse.json();
    const submissionResponse = await backendFetch("/api/candidate-submissions", { credentials: "include" });
    const submissionBody = await submissionResponse.json();
    if (r.ok) setDocs(j.data.items);
    if (candidateResponse.ok) setCandidateDocs(candidateBody.data.items);
    if (submissionResponse.ok) setCandidateSubmissions(submissionBody.data.items);
    if (!r.ok && !candidateResponse.ok && !submissionResponse.ok) setMsg(j.error?.message || candidateBody.error?.message || submissionBody.error?.message || "Could not load documents");
  }
  async function state(id: string, status: string) {
    const r = await fetch(`/api/v1/documents/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setMsg(r.ok ? `Document ${status.toLowerCase()}` : "Could not update document");
    if (r.ok) await load();
  }
  async function download(id: string) {
    const r = await fetch(`/api/v1/documents/${id}/download`),
      j = await r.json();
    if (!r.ok) {
      setMsg(j.error?.message || "Could not download document");
      return;
    }
    window.location.assign(j.data.downloadUrl);
  }
  async function openCandidateDocument(candidateId: string, documentId: string, download = false) {
    const r = await fetch(`/api/v1/candidates/${candidateId}/documents/${documentId}/download?response=json${download ? "&download=1" : ""}`);
    const body = await r.json();
    if (!r.ok) { setMsg(body.error?.message || "Could not open document"); return; }
    window.open(body.data.downloadUrl, "_blank", "noopener,noreferrer");
  }
  async function upload() {
    if (!file || !ownerId || !documentType || !title) {
      setMsg("Owner, document type, title, and file are required");
      return;
    }
    const headers = { "content-type": "application/json" };
    const uploadResponse = await fetch("/api/v1/documents/upload-url", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ownerType,
        ownerId,
        fileName: file.name,
        contentType: file.type,
        byteSize: file.size,
      }),
    });
    const uploadBody = await uploadResponse.json();
    if (!uploadResponse.ok) {
      setMsg(uploadBody.error?.message || "Could not prepare upload");
      return;
    }
    const stored = await fetch(uploadBody.data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!stored.ok) {
      setMsg("Object storage rejected the upload");
      return;
    }
    const createResponse = await fetch("/api/v1/documents", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ownerType,
        ownerId,
        documentType,
        title,
        objectKey: uploadBody.data.objectKey,
        fileName: file.name,
        contentType: file.type,
        byteSize: file.size,
      }),
    });
    const createBody = await createResponse.json();
    setMsg(createResponse.ok ? "Document uploaded" : createBody.error?.message || "Upload failed");
    if (createResponse.ok) {
      setFile(null);
      await load();
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Secure repository</p>
        <h1>Documents</h1>
        <div className="toolbar">
          <button onClick={() => void load()}>Refresh</button>
        </div>
        <fieldset>
          <legend>Add document</legend>
          <select
            aria-label="Owner type"
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value as "EMPLOYEE" | "CANDIDATE")}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="CANDIDATE">Candidate</option>
          </select>
          <input
            aria-label="Owner ID"
            placeholder="Owner ID"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          />
          <input
            aria-label="Document type"
            placeholder="Document type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          />
          <input
            aria-label="Document title"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            aria-label="Document file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button onClick={() => void upload()}>Upload</button>
        </fieldset>
        {msg && <p role="status">{msg}</p>}
        <div className="candidate-list">
          <h2>Candidate-submitted documents</h2>
          {candidateDocs.map((d) => (
            <article className="candidate-row candidate-document-row" key={`candidate-${d.id}`}>
              <span className="candidate-document-file"><strong>{d.fileName}</strong><small>{d.kind}</small></span>
              <span className="candidate-document-candidate"><strong>{d.candidate.firstName} {d.candidate.lastName}</strong><small>{d.candidate.referenceNo} · {d.candidate.email}</small></span>
              <span className="candidate-document-meta"><small>{Math.ceil(d.byteSize / 1024)} KB</small><small>{new Date(d.createdAt).toLocaleDateString()}</small></span>
              <span className="candidate-document-actions"><button className="candidate-document-preview" onClick={() => void openCandidateDocument(d.candidate.id, d.id)}>Preview</button><button className="candidate-document-download" onClick={() => void openCandidateDocument(d.candidate.id, d.id, true)}>Download</button></span>
            </article>
          ))}
          {candidateDocs.length === 0 && <p className="empty-state">No candidate-submitted documents found.</p>}
          <h2>Candidate-submitted forms</h2>
          {candidateSubmissions.map((submission) => (
            <article className="candidate-row candidate-document-row" key={`submission-${submission.id}`}>
              <span className="candidate-document-file"><strong>{submission.referenceNo}</strong><small>{submission.source.replace("_", " ")} form</small></span>
              <span className="candidate-document-candidate"><strong>{submission.candidate.firstName} {submission.candidate.lastName}</strong><small>{submission.candidate.referenceNo} · {submission.candidate.email}</small></span>
              <span className="candidate-document-meta"><small>{new Date(submission.submittedAt).toLocaleDateString()}</small><small>Filled form saved</small></span>
              <span className="candidate-document-actions"><a className="candidate-document-preview" href={`/hr/candidates/${submission.candidate.id}/preview`}>View submitted form</a></span>
            </article>
          ))}
          {candidateSubmissions.length === 0 && <p className="empty-state">No candidate-submitted forms found.</p>}
          <h2>Managed documents</h2>
          {docs.map((d) => (
            <article className="candidate-row" key={d.id}>
              <span>
                {d.title} · {d.documentType}
              </span>
              <span>
                {d.ownerType} · version {d.currentVersionNumber}
              </span>
              <span>{d.expiresAt ? `Expires ${d.expiresAt.slice(0, 10)}` : "No expiry"}</span>
              <span>
                {d.status}
                <button onClick={() => void state(d.id, "ARCHIVED")}>Archive</button>
                <button onClick={() => void download(d.id)}>Download</button>
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
