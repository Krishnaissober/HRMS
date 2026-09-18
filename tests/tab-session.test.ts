import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expireTabSessionCookie,
  isValidTabId,
  serializeTabSessionCookie,
  tabIdFromPath,
  tabPathWithoutPrefix,
  tabScopedPath,
} from "@/lib/tab-session";
import { getClientTabId } from "@/lib/tab-session-client";

const tabId = "0123456789abcdef0123456789abcdef";

describe("tab-scoped sessions", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts opaque tab handles and rejects unsafe values", () => {
    expect(isValidTabId(tabId)).toBe(true);
    expect(isValidTabId("short")).toBe(false);
    expect(isValidTabId("../../admin")).toBe(false);
  });

  it("round-trips scoped paths without putting a session token in the URL", () => {
    const path = tabScopedPath(tabId, "/hr/dashboard?view=today");
    expect(path).toBe(`/t/${tabId}/hr/dashboard?view=today`);
    expect(tabIdFromPath(path)).toBe(tabId);
    expect(tabPathWithoutPrefix(path)).toBe("/hr/dashboard?view=today");
    expect(path).not.toContain("session");
  });

  it("uses an HttpOnly cookie for the session token", () => {
    const cookie = serializeTabSessionCookie(tabId, "opaque-session-token", "http://localhost:3000");
    expect(cookie).toContain(`hrms.tab-session.${tabId}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Secure");
    expect(expireTabSessionCookie(tabId, "https://hrms.example")).toContain("Max-Age=0");
  });

  it("uses the tab id in a scoped URL even when session storage contains an older id", () => {
    const storedTabId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const values = new Map([["triple-minds.hrms.tab-id", storedTabId]]);
    vi.stubGlobal("window", {
      location: { pathname: `/t/${tabId}/hr/dashboard` },
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    expect(getClientTabId()).toBe(tabId);
    expect(values.get("triple-minds.hrms.tab-id")).toBe(tabId);
  });
});
