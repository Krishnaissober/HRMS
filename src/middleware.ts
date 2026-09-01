import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/api/:path*"] };
