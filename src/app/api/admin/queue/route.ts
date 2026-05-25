import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── GET /api/admin/queue — List submissions (with filters) ──
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const electionId = searchParams.get("electionId");
    const officeId = searchParams.get("officeId");
    const languageCode = searchParams.get("languageCode");
    const query = searchParams.get("query");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (electionId) {
      where.electionId = electionId;
    }
    if (officeId) {
      where.officeId = officeId;
    }
    if (languageCode) {
      where.languageCode = languageCode;
    }
    if (query) {
      where.OR = [
        { candidate: { officialFirstName: { contains: query, mode: "insensitive" } } },
        { candidate: { officialLastName: { contains: query, mode: "insensitive" } } },
        { office: { label: { contains: query, mode: "insensitive" } } },
      ];
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: where as any,
        include: {
          candidate: {
            select: {
              id: true,
              officialFirstName: true,
              officialLastName: true,
            },
          },
          election: { select: { id: true, label: true, cycleYear: true } },
          office: { select: { id: true, label: true, category: true } },
          reviewer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { submissionDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.submission.count({ where: where as any }),
    ]);

    // Get elections and offices for filter dropdowns
    const [elections, offices] = await Promise.all([
      prisma.election.findMany({
        select: { id: true, label: true, cycleYear: true, status: true },
        orderBy: { cycleYear: "desc" },
      }),
      prisma.office.findMany({
        select: { id: true, label: true, category: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: submissions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      filters: { elections, offices },
    });
  } catch (error) {
    console.error("Queue error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}