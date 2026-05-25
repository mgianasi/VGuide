import { NextResponse } from "next/server";

// GET /api/elections — List all elections
export async function GET() {
  // In production, this queries Prisma:
  // const elections = await prisma.election.findMany({ orderBy: { cycleYear: 'desc' } });
  return NextResponse.json({
    success: true,
    data: [],
    message: "Endpoint ready. Connect Prisma to populate data.",
  });
}