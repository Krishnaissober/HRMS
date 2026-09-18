import { tabIdFromPath, tabScopedPath } from "@/lib/tab-session";

// The tab session cookie is persistent for 30 days, so the client-side tab
// identifier must survive closing and reopening the site as well.
const TAB_ID_STORAGE_KEY = "triple-minds.hrms.persistent-tab-id";
const LEGACY_TAB_ID_STORAGE_KEY = "triple-minds.hrms.tab-id";

export function getClientTabId() {
  if (typeof window === "undefined") return null;
  const localStorage = window.localStorage;
  const sessionStorage = window.sessionStorage;
  const scopedPathTabId = tabIdFromPath(window.location.pathname);
  if (scopedPathTabId) {
    localStorage?.setItem(TAB_ID_STORAGE_KEY, scopedPathTabId);
    sessionStorage?.setItem(LEGACY_TAB_ID_STORAGE_KEY, scopedPathTabId);
    return scopedPathTabId;
  }
  const activeTabId = sessionStorage?.getItem(LEGACY_TAB_ID_STORAGE_KEY);
  if (activeTabId) return activeTabId;
  const existing = localStorage?.getItem(TAB_ID_STORAGE_KEY);
  if (existing) {
    localStorage?.setItem(TAB_ID_STORAGE_KEY, existing);
    sessionStorage?.setItem(LEGACY_TAB_ID_STORAGE_KEY, existing);
    return existing;
  }
  const tabId = crypto.randomUUID().replaceAll("-", "");
  localStorage?.setItem(TAB_ID_STORAGE_KEY, tabId);
  sessionStorage?.setItem(LEGACY_TAB_ID_STORAGE_KEY, tabId);
  return tabId;
}

export function getClientTabPath(pathname: string) {
  const tabId = getClientTabId();
  return tabId ? tabScopedPath(tabId, pathname) : pathname;
}

export async function establishClientTabSession(sessionToken: string) {
  const tabId = getClientTabId();
  if (!tabId) throw new Error("This browser does not support tab-scoped sessions.");
  const response = await fetch("/api/auth/tab-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tabId, sessionToken }),
  });
  if (!response.ok) throw new Error("Could not establish the browser-tab session.");
  return tabId;
}

export async function prepareClientTabOAuth() {
  const tabId = getClientTabId();
  if (!tabId) throw new Error("This browser does not support tab-scoped sessions.");
  const response = await fetch("/api/auth/tab-session/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tabId }),
  });
  if (!response.ok) throw new Error("Could not prepare the browser-tab session.");
  return tabId;
}
