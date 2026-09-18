"use client";

import { useEffect } from "react";
import { getClientTabId, getClientTabPath } from "@/lib/tab-session-client";

function shouldAttachTabHeader(pathname: string) {
  if (pathname.startsWith("/api/auth/tab-session")) return false;
  if (pathname.startsWith("/api/auth/sign-in")) return false;
  if (pathname.startsWith("/api/auth/sign-up")) return false;
  if (pathname.startsWith("/api/auth/callback")) return false;
  if (pathname.startsWith("/api/v1/public")) return false;
  return (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/v1/") ||
    pathname.startsWith("/hr") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/me")
  );
}

export function TabSessionBootstrap() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const tabId = getClientTabId();

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (!tabId) return originalFetch(input, init);
      const requestUrl = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
        window.location.origin,
      );
      if (requestUrl.origin !== window.location.origin || !shouldAttachTabHeader(requestUrl.pathname)) {
        return originalFetch(input, init);
      }
      const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
      headers.set("x-hrms-tab-id", tabId);
      return originalFetch(input, { ...init, headers });
    }) as typeof window.fetch;

    function handleProtectedLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin || !shouldAttachTabHeader(url.pathname)) return;
      if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/api/v1/")) return;
      if (url.pathname.startsWith("/t/")) return;
      event.preventDefault();
      window.location.assign(getClientTabPath(`${url.pathname}${url.search}${url.hash}`));
    }

    document.addEventListener("click", handleProtectedLink, true);
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", handleProtectedLink, true);
    };
  }, []);

  return null;
}
