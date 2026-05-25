// ══════════════════════════════════════════════
// VGuide — Next.js Middleware
// ══════════════════════════════════════════════
//
// Protects candidate dashboard routes, handles
// locale-based redirects.
// ══════════════════════════════════════════════

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "vguide-dev-secret-change-in-production-32char!"
);

const SESSION_COOKIE = "vguide_session";

// Locales we support
const LOCALES = ["en", "es", "pl", "zh", "ar", "hi", "ur", "ko", "vi", "tl"];

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/candidate/login",
  "/candidate/register",
  "/voters-guide",
  "/system-unavailable",
  "/api/auth/login",
  "/api/auth/register",
  "/api/availability",
  "/api/elections",
  "/api/candidates",
  "/api/policy-questions",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Allow public routes ────────────────────
  for (const route of PUBLIC_ROUTES) {
    if (pathname.includes(route)) {
      return NextResponse.next();
    }
  }

  // ── Protect candidate dashboard routes ────
  if (pathname.includes("/candidate/dashboard")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      // Extract locale from path
      const locale =
        LOCALES.find((l) => pathname.startsWith(`/${l}`)) ?? "en";
      return NextResponse.redirect(
        new URL(`/${locale}/candidate/login`, request.url)
      );
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Invalid/expired token
      const locale =
        LOCALES.find((l) => pathname.startsWith(`/${l}`)) ?? "en";
      const response = NextResponse.redirect(
        new URL(`/${locale}/candidate/login`, request.url)
      );
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }

  // ── Root redirect to English ──────────────
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/en/voters-guide", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files, favicon, etc.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};