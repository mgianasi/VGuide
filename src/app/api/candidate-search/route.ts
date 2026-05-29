import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/voters-guide/search — Search approved candidates ──
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get("electionId") ?? undefined;
    const officeId = searchParams.get("officeId") ?? undefined;
    const party = searchParams.get("party") ?? undefined;
    const query = searchParams.get("query") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "24")),
    );

    // Build where clause - Must be approved
    const where: Record<string, unknown> = {
      status: "approved",
    };

    if (electionId) {
      where.electionId = electionId;
    }
    if (officeId) {
      where.officeId = officeId;
    }
    if (party) {
        where.candidate = { party: party };
    }
    if (query) {
      where.OR = [
        {
          candidate: {
            officialFirstName: { contains: query, mode: "insensitive" },
          },
        },
        {
          candidate: {
            officialLastName: { contains: query, mode: "insensitive" },
          },
        },
        { office: { label: { contains: query, mode: "insensitive" } } },
      ];
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: where as any,
        include: {
          candidate: {
            select: {
              id: true,
              officialFirstName: true,
              officialLastName: true,
              party: true,
              campaignName: true,
              profilePictureUrl: true,
              campaignWebsite: true,
            },
          },
          office: { select: { id: true, label: true, category: true } },
        },
        orderBy: { candidate: { officialLastName: "asc" } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.submission.count({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: where as any,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: submissions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Voters Guide Search error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
