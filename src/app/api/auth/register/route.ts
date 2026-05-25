import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyCaptcha } from "@/lib/auth";

// ── POST /api/auth/register — Create a new candidate account ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, captchaToken } = body;

    // ── Validate required fields ───────────────
    const errors: string[] = [];
    if (!email || typeof email !== "string") errors.push("email is required");
    if (!password || typeof password !== "string")
      errors.push("password is required");
    if (!firstName || typeof firstName !== "string")
      errors.push("firstName is required");
    if (!lastName || typeof lastName !== "string")
      errors.push("lastName is required");

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join("; ") },
        { status: 400 },
      );
    }

    // ── Verify CAPTCHA if token provided ───────
    if (captchaToken) {
      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        return NextResponse.json(
          { success: false, error: "CAPTCHA verification failed" },
          { status: 400 },
        );
      }
    }

    // ── Check email uniqueness ─────────────────
    const existing = await prisma.candidateAccount.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // ── Hash password ──────────────────────────
    const passwordHash = hashPassword(password);

    // ── Create account + candidate (1:1) ───────
    const account = await prisma.candidateAccount.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() ?? null,
        isVerified: true,
        candidate: {
          create: {
            officialFirstName: firstName.trim(),
            officialLastName: lastName.trim(),
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created",
        accountId: account.id,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("Registration error:", e);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
