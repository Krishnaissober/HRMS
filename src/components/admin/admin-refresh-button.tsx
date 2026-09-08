"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AdminRefreshButton() {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isRefreshing}
      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-70"
    >
      <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} />
      {isRefreshing ? "Refreshing" : "Refresh data"}
    </button>
  );
}
