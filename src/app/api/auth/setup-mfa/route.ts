import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, generateMfaSecret, verifyMfaToken } from "@/lib/auth";

// ── POST /api/auth/setup-mfa — Generate MFA secret ──
export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { secret, otpauthUrl } = generateMfaSecret();

    // Store secret temporarily (will be confirmed on next step)
    return NextResponse.json({
      success: true,
      secret,
      otpauthUrl,
    });
  } catch (e) {
    console.error("MFA setup error:", e);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PUT /api/auth/setup-mfa — Confirm MFA with TOTP token ──
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { secret, token } = body;

    if (!secret || !token) {
      return NextResponse.json(
        { success: false, error: "Secret and token are required" },
        { status: 400 },
      );
    }

    // Verify the token against the secret to confirm setup
    const isValid = verifyMfaToken(secret, token);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid verification code. Please try again.",
        },
        { status: 400 },
      );
    }

    // Save MFA secret and enable MFA
    await prisma.candidateAccount.update({
      where: { id: session.sub },
      data: {
        mfaSecret: secret,
        mfaEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "MFA enabled successfully",
    });
  } catch (e) {
    console.error("MFA confirm error:", e);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
