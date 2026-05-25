import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── GET /api/admin/queue/[id] — Fetch single submission ──
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        candidate: {
          select: {
            officialFirstName: true,
            officialLastName: true,
            campaignName: true,
            party: true,
            partyOther: true,
            education: true,
            currentEmployment: true,
            age: true,
          },
        },
        election: { select: { label: true, cycleYear: true } },
        office: { select: { label: true, category: true } },
        reviewer: { select: { displayName: true } },
        logs: {
          include: { admin: { select: { displayName: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: submission });
  } catch (error) {
    console.error("Fetch submission error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
