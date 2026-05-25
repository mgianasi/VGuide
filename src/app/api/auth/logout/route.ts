import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

// ── POST /api/auth/logout — Clear session and redirect ──
export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({
      success: true,
      redirectTo: "/en/candidate/login",
    });
  } catch (e) {
    console.error("Logout error:", e);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}