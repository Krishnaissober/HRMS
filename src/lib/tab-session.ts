const TAB_ID_PATTERN = /^[a-zA-Z0-9_-]{20,80}$/;
const TAB_COOKIE_PREFIX = "hrms.tab-session.";
export const ACTIVE_TAB_COOKIE = "hrms.active-tab-id";

export const TAB_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function isValidTabId(tabId: string | null | undefined): tabId is string {
  return Boolean(tabId && TAB_ID_PATTERN.test(tabId));
}

export function tabSessionCookieName(tabId: string) {
  if (!isValidTabId(tabId)) throw new Error("Invalid tab id");
  return `${TAB_COOKIE_PREFIX}${tabId}`;
}

export function tabScopedPath(tabId: string, pathname: string) {
  if (!isValidTabId(tabId)) throw new Error("Invalid tab id");
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/t/${tabId}${normalized === "/" ? "/" : normalized}`;
}

export function tabIdFromPath(pathname: string) {
  const match = pathname.match(/^\/t\/([a-zA-Z0-9_-]{20,80})(?=\/|$)/);
  return match && isValidTabId(match[1]) ? match[1] : null;
}

export function tabPathWithoutPrefix(pathname: string) {
  const tabId = tabIdFromPath(pathname);
  if (!tabId) return null;
  const withoutPrefix = pathname.slice(`/t/${tabId}`.length);
  return withoutPrefix || "/";
}

export function serializeTabSessionCookie(
  tabId: string,
  sessionToken: string,
  requestUrl: string,
) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${tabSessionCookieName(tabId)}=${encodeURIComponent(sessionToken)}; Max-Age=${TAB_SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function expireTabSessionCookie(tabId: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${tabSessionCookieName(tabId)}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function serializeActiveTabCookie(tabId: string, requestUrl: string) {
  if (!isValidTabId(tabId)) throw new Error("Invalid tab id");
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${ACTIVE_TAB_COOKIE}=${encodeURIComponent(tabId)}; Max-Age=${TAB_SESSION_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function expireActiveTabCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${ACTIVE_TAB_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

export const TAB_OAUTH_COOKIE = "hrms.oauth-tab";

export function serializeOAuthTabCookie(tabId: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${TAB_OAUTH_COOKIE}=${encodeURIComponent(tabId)}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function expireOAuthTabCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${TAB_OAUTH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
}
