"use client";

import { useEffect, useState } from "react";

type ArchivedForm = {
  id: string;
  kind: "social" | "walk-in";
  url: string;
  previewUrl: string;
  title: string;
  createdAt: string;
  abortedAt: string;
};

export function AbortedFormsList() {
  const [forms, setForms] = useState<ArchivedForm[]>([]);

  useEffect(() => {
    function loadArchive() {
      try {
        const saved = window.localStorage.getItem("triple-minds-aborted-forms");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const unique = parsed.filter(
              (form, index, current) =>
                form &&
                typeof form.url === "string" &&
                current.findIndex((item) => item?.url === form.url) === index,
            );
            setForms(unique);
            window.localStorage.setItem("triple-minds-aborted-forms", JSON.stringify(unique));
          }
        }
      } catch {
        /* archive remains empty when storage is unavailable */
      }
    }
    loadArchive();
    window.addEventListener("triple-minds-aborted-forms-updated", loadArchive);
    return () => window.removeEventListener("triple-minds-aborted-forms-updated", loadArchive);
  }, []);

  return (
    <section className="forms-aborted-card" aria-labelledby="aborted-forms-title">
      <div className="forms-card-heading">
        <div>
          <p className="eyebrow">Archive</p>
          <h2 id="aborted-forms-title">Aborted forms</h2>
        </div>
        <span>{forms.length}</span>
      </div>
      {forms.length ? (
        <div className="forms-aborted-list">
          {forms.map((form) => (
            <article className="forms-aborted-item" key={form.id}>
              <div className="forms-recent-avatar">{form.kind === "social" ? "S" : "W"}</div>
              <div>
                <strong>{form.title}</strong>
                <small>Aborted {new Date(form.abortedAt).toLocaleDateString()}</small>
              </div>
              <div className="forms-aborted-actions">
                <a href={form.previewUrl}>Preview</a>
                <a href={form.url} target="_blank" rel="noreferrer">
                  Open link
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">Aborted forms will be saved here for future use.</p>
      )}
    </section>
  );
}
