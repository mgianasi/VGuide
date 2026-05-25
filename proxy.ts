import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ──────────────────────────────────────────────
// i18n Configuration
// ──────────────────────────────────────────────
const locales = ["en", "es", "pl", "zh", "ar", "hi", "ur", "ko", "vi", "tl"];
const defaultLocale = "en";

// ──────────────────────────────────────────────
// Proxy — i18n routing + availability gate
// ──────────────────────────────────────────────
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal paths
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return;
  }

  // Check if path already has a locale prefix
  const pathnameHasLocale = locales.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale) {
    // Redirect to default locale
    request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Continue with locale in path
  return;
}

export const config = {
  matcher: ["/((?!_next|api|_next/static|_next/image|favicon.ico).*)"],
};