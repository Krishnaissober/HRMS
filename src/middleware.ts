import { NextRequest, NextResponse } from "next/server";
import {
  isValidTabId,
  tabIdFromPath,
  tabPathWithoutPrefix,
  tabSessionCookieName,
  TAB_OAUTH_COOKIE,
  ACTIVE_TAB_COOKIE,
} from "@/lib/tab-session";

function isPublicAuthPath(pathname: string) {
  return (
    pathname === "/api/auth/tab-session" ||
    pathname === "/api/auth/tab-session/prepare" ||
    pathname.startsWith("/api/auth/sign-in") ||
    pathname.startsWith("/api/auth/sign-up") ||
    pathname.startsWith("/api/auth/callback/") ||
    pathname.startsWith("/api/auth/email-otp/")
  );
}

function isPublicApiPath(pathname: string) {
  return pathname.startsWith("/api/v1/public/") || pathname === "/api/v1/public";
}

function protectedRequest(pathname: string) {
  return (
    pathname.startsWith("/hr") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/me") ||
    pathname.startsWith("/api/v1/") ||
    pathname.startsWith("/api/auth/")
  );
}

function tabIdFromReferer(request: NextRequest) {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return tabIdFromPath(new URL(referer).pathname);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const originalPath = request.nextUrl.pathname;
  const pathTabId = tabIdFromPath(originalPath);
  const scopedPath = tabPathWithoutPrefix(originalPath);
  const requestTabId = request.headers.get("x-hrms-tab-id");
  const persistedTabId = request.cookies.get(ACTIVE_TAB_COOKIE)?.value;
  const oauthTabId = request.cookies.get(TAB_OAUTH_COOKIE)?.value;
  const tabId = isValidTabId(pathTabId)
    ? pathTabId
    : isValidTabId(requestTabId)
      ? requestTabId
      : isValidTabId(oauthTabId)
        ? oauthTabId
        : isValidTabId(persistedTabId)
          ? persistedTabId
        : tabIdFromReferer(request);
  const effectivePath = scopedPath || originalPath;
  const isScopedRequest = Boolean(scopedPath && pathTabId);
  const isOAuthCallback = effectivePath.startsWith("/api/auth/callback/");

  if (isScopedRequest && tabId !== pathTabId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicAuthPath(effectivePath) || isPublicApiPath(effectivePath)) {
    const requestHeaders = new Headers(request.headers);
    if (tabId) requestHeaders.set("x-hrms-tab-id", tabId);
    requestHeaders.set("x-hrms-auth-path", effectivePath);
    if (isScopedRequest) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = effectivePath;
      const response = NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
      response.headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (protectedRequest(effectivePath) && !isScopedRequest && !isValidTabId(requestTabId) && tabId) {
    const scopedUrl = new URL(request.url);
    scopedUrl.pathname = `/t/${tabId}${effectivePath}`;
    return NextResponse.redirect(scopedUrl);
  }

  if (protectedRequest(effectivePath)) {
    const sessionToken = tabId ? request.cookies.get(tabSessionCookieName(tabId))?.value : null;
    const hasSession = Boolean(sessionToken);
    const canUseOAuthCallback = isOAuthCallback && Boolean(tabId);
    if (!hasSession && !canUseOAuthCallback) {
      if (effectivePath.startsWith("/api/")) {
        return Response.json({ error: "Authentication required." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    const requestHeaders = new Headers(request.headers);
    if (tabId) requestHeaders.set("x-hrms-tab-id", tabId);
    requestHeaders.set("x-hrms-auth-path", effectivePath);
    if (sessionToken) requestHeaders.set("authorization", `Bearer ${decodeURIComponent(sessionToken)}`);

    if (isScopedRequest) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = effectivePath;
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (isScopedRequest) {
    if (!tabId) return NextResponse.redirect(new URL("/", request.url));
    const sessionToken = tabId ? request.cookies.get(tabSessionCookieName(tabId))?.value : null;
    if (!sessionToken) return NextResponse.redirect(new URL("/", request.url));
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-hrms-tab-id", tabId);
    requestHeaders.set("authorization", `Bearer ${decodeURIComponent(sessionToken)}`);
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = effectivePath;
    return NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
  }

  const requestHeaders = new Headers(request.headers);
  if (originalPath === "/" && tabId) requestHeaders.set("x-hrms-tab-id", tabId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/", "/hr/:path*", "/admin/:path*", "/me/:path*", "/api/:path*", "/t/:path*"],
};
