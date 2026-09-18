import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import {
  expireOAuthTabCookie,
  expireActiveTabCookie,
  expireTabSessionCookie,
  isValidTabId,
  serializeTabSessionCookie,
  serializeActiveTabCookie,
} from "@/lib/tab-session";

const handlers = toNextJsHandler(auth);

async function withTabSession(request: Request, handler: (request: Request) => Promise<Response>) {
  const tabId = request.headers.get("x-hrms-tab-id");
  const authPath = request.headers.get("x-hrms-auth-path");
  const requestForBetterAuth = authPath
    ? new Request(new URL(`${authPath}${new URL(request.url).search}`, request.url), request)
    : request;
  const response = await handler(requestForBetterAuth);
  if (!isValidTabId(tabId)) return response;

  const pathname = authPath || new URL(request.url).pathname;
  const headers = new Headers(response.headers);
  const authToken = response.headers.get("set-auth-token");
  const createsSession =
    pathname.endsWith("/callback/google") ||
    pathname.endsWith("/sign-in/social") ||
    pathname.endsWith("/sign-in/email") ||
    pathname.endsWith("/sign-up/email");
  if (authToken && createsSession) {
    headers.append("Set-Cookie", serializeTabSessionCookie(tabId, authToken, request.url));
    headers.append("Set-Cookie", serializeActiveTabCookie(tabId, request.url));
    headers.append("Set-Cookie", expireOAuthTabCookie(request.url));
  }
  if (pathname.endsWith("/sign-out")) {
    headers.append("Set-Cookie", expireTabSessionCookie(tabId, request.url));
    headers.append("Set-Cookie", expireActiveTabCookie(request.url));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function GET(request: Request) {
  return withTabSession(request, handlers.GET);
}

export function POST(request: Request) {
  return withTabSession(request, handlers.POST);
}
