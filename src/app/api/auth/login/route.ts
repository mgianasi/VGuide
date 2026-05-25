import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  setSessionCookie,
  setMfaPendingCookie,
} from "@/lib/auth";

// ──────────────────────────────────────────────
// POST /api/auth/login — Candidate login
// ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const account = await prisma.candidateAccount.findUnique({
      where: { email },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const passwordValid = verifyPassword(password, account.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (account.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          error: "Account has been suspended. Contact support.",
        },
        { status: 403 }
      );
    }

    // ── MFA flow ─────────────────────────────
    if (account.mfaEnabled) {
      await setMfaPendingCookie(account.id);
      return NextResponse.json({ success: true, requiresMfa: true });
    }

    // ── Standard session ─────────────────────
    await setSessionCookie({
      sub: account.id,
      role: "candidate",
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
    });

    return NextResponse.json({
      success: true,
      redirectTo: "/en/candidate/dashboard",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Invalid email or password" },
      { status: 401 }
    );
  }
}
