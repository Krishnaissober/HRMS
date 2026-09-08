import type { NextConfig } from "next";

const developmentScriptSources = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
const storageOrigin = (() => {
  if (!process.env.S3_ENDPOINT) return "";
  try {
    return new URL(process.env.S3_ENDPOINT).origin;
  } catch {
    return "";
  }
})();
const backendOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").origin;
  } catch {
    return "http://localhost:4000";
  }
})();
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${developmentScriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://quickchart.io",
  "font-src 'self' data:",
  `connect-src 'self' ws: wss: ${backendOrigin}${storageOrigin ? ` ${storageOrigin}` : ""}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  // Keep development, production, and isolated E2E builds from sharing a
  // partially-written webpack cache or server bundle.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Import only the icons used by each route instead of compiling the full icon barrel.
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
