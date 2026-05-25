import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyMfaToken,
  setSessionCookie,
  getMfaPendingAccountId,
  clearSession,
} from "@/lib/auth";

// ── POST /api/auth/verify-mfa ──────────────────
// Verify a TOTP code against the pending MFA session.
// Expects JSON body: { token: string }
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Verification code is required" },
        { status: 400 }
      );
    }

    // 2. Get pending account ID from MFA cookie
    const accountId = await getMfaPendingAccountId();

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "No pending MFA session found" },
        { status: 401 }
      );
    }

    // 3. Fetch the candidate account from DB
    const account = await prisma.candidateAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 401 }
      );
    }

    // 4. Verify the TOTP token
    if (!account.mfaSecret) {
      return NextResponse.json(
        { success: false, error: "MFA is not configured for this account" },
        { status: 401 }
      );
    }

    const isValid = verifyMfaToken(account.mfaSecret, token);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 401 }
      );
    }

    // 5. Valid — clear pending MFA cookie and set new session cookie
    await clearSession();
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
    console.error("MFA verification error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}