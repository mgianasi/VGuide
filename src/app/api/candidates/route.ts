import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// GET /api/candidates — Search candidates
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const electionId = searchParams.get("electionId");
  const officeId = searchParams.get("officeId");
  const party = searchParams.get("party");
  const query = searchParams.get("query");
  const language = searchParams.get("language") ?? "en";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

  // In production:
  // const where = { electionId, officeId, party: { contains: party, mode: 'insensitive' }, ... };
  // const candidates = await prisma.submission.findMany({ where: { status: 'approved', ... }, include: { candidate: true, office: true } });

  return NextResponse.json({
    success: true,
    data: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
    message: "Endpoint ready. Connect Prisma to populate data.",
  });
}