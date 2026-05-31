import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { captchaStore } from "@/app/api/auth/captcha/route";

// ── POST /api/auth/register — Create a new candidate account ──
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    captchaId?: string;
    answer?: unknown;
  } | null;

  const errors: string[] = [];
  if (!payload) errors.push("Invalid request body");
  if (!payload?.email) errors.push("email is required");
  if (!payload?.password) errors.push("password is required");
  if (!payload?.firstName) errors.push("firstName is required");
  if (!payload?.lastName) errors.push("lastName is required");

  const normalizedAnswer = typeof payload?.answer === "string" ? Number(payload.answer) : NaN;
  const record = captchaStore.get((payload?.captchaId as string) || "");
  if (!Number.isFinite(normalizedAnswer) || !record || record.expiresAt < Date.now() || record.answer !== normalizedAnswer) {
    errors.push("CAPTCHA verification failed");
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, error: errors[0] }, { status: 400 });
  }

  try {
    const existing = await prisma.candidateAccount.findUnique({
      where: { email: payload!.email!.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = hashPassword(payload!.password!);
    const account = await prisma.candidateAccount.create({
      data: {
        email: payload!.email!.toLowerCase().trim(),
        passwordHash,
        firstName: payload!.firstName!.trim(),
        lastName: payload!.lastName!.trim(),
        phone: payload?.phone?.trim() ?? null,
        isVerified: true,
        candidate: { create: { officialFirstName: payload!.firstName!.trim(), officialLastName: payload!.lastName!.trim() } },
      },
    });

    return NextResponse.json({ success: true, message: "Account created", accountId: account.id }, { status: 201 });
  } catch (e) {
    console.error("Registration error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
