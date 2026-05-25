import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

// ── POST /api/admin/login — Admin login ──
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const account = await prisma.adminAccount.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { role: { select: { name: true, permissions: true } } },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const passwordValid = verifyPassword(password, account.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!account.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Account has been deactivated. Contact support.",
        },
        { status: 403 },
      );
    }

    // ── MFA flow ─────────────────────────────
    if (account.mfaEnabled) {
      // Generate a pending MFA token (reuse same approach)
      const { default: speakeasy } = await import("speakeasy");
      // Store pending admin session — use same MFA pending cookie pattern
      const { cookies } = await import("next/headers");
      const { SignJWT } = await import("jose");
      const JWT_SECRET = new TextEncoder().encode(
        process.env.JWT_SECRET ??
          "vguide-dev-secret-change-in-production-32char!",
      );
      const token = await new SignJWT({ sub: account.id, role: "admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("300s")
        .sign(JWT_SECRET);
      const cookieStore = await cookies();
      cookieStore.set("vguide_mfa_pending", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 300,
      });
      return NextResponse.json({ success: true, requiresMfa: true });
    }

    // ── Set session ──────────────────────────
    // Update lastLoginAt
    await prisma.adminAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    await setSessionCookie({
      sub: account.id,
      role: "admin",
      email: account.email,
      firstName: account.displayName,
      lastName: "",
    });

    return NextResponse.json({
      success: true,
      redirectTo: "/en/admin/queue",
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "Invalid email or password" },
      { status: 401 },
    );
  }
}
