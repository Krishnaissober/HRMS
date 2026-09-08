"use client";

import dynamic from "next/dynamic";

const CandidateFormShareLinks = dynamic(
  () =>
    import("@/components/candidates/CandidateFormShareLinks").then(
      (module) => module.CandidateFormShareLinks,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="form-editor-loading" role="status" aria-label="Loading form editor">
        <div className="h-4 w-32 animate-pulse rounded bg-indigo-200 dark:bg-indigo-950" />
        <div className="mt-4 h-8 w-72 animate-pulse rounded-xl bg-muted" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    ),
  },
);

export function CandidateIntakeChooserClient() {
  return <CandidateFormShareLinks />;
}
