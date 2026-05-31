// ══════════════════════════════════════════════
// VGuide — Next.js Middleware (Proxy)
// ══════════════════════════════════════════════
//
// Protects candidate dashboard and admin routes,
// handles locale-based redirects.
// ══════════════════════════════════════════════

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "vguide-dev-secret-change-in-production-32char!",
);

const SESSION_COOKIE = "vguide_session";

// Locales we support
const LOCALES = ["en", "es", "pl", "zh", "ar", "hi", "ur", "ko", "vi", "tl"];

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/candidate/login",
  "/candidate/register",
  "/admin/login",
  "/voters-guide",
  "/system-unavailable",
  "/policy-questions",
  "/api/auth/login",
  "/api/auth/register",
  "/api/admin/login",
  "/api/availability",
  "/api/elections",
  "/api/candidates",
  "/api/candidate-search",
  "/api/policy-questions",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Allow public routes ────────────────────
  for (const route of PUBLIC_ROUTES) {
    if (pathname.includes(route)) {
      return NextResponse.next();
    }
  }

  // Helper: extract locale from path
  function getLocale(): string {
    return LOCALES.find((l) => pathname.startsWith(`/${l}`)) ?? "en";
  }

  // ── Protect admin routes ───────────────────
  if (pathname.includes("/admin/")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL(`/${getLocale()}/admin/login`, request.url),
      );
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if ((payload as { role?: string }).role !== "admin") {
        // Not an admin — redirect to login
        const response = NextResponse.redirect(
          new URL(`/${getLocale()}/admin/login`, request.url),
        );
        response.cookies.delete(SESSION_COOKIE);
        return response;
      }
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(
        new URL(`/${getLocale()}/admin/login`, request.url),
      );
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }

  // ── Protect candidate dashboard routes ────
  if (pathname.includes("/candidate/dashboard")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL(`/${getLocale()}/candidate/login`, request.url),
      );
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(
        new URL(`/${getLocale()}/candidate/login`, request.url),
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
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|api/auth/login|api/auth/register|api/admin/login|api/availability|api/elections|api/candidates|api/candidate-search|api/policy-questions|policy-questions/.*\\.pdf).*)",
  ],
};
