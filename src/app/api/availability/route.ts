import { NextResponse } from "next/server";

// GET /api/availability — Check system availability gate
export async function GET() {
  // In production, queries system_config for availability override
  // and checks active election windows:
  // const config = await prisma.systemConfig.findUnique({ where: { key: 'system_availability_message' } });
  // const activeElection = await prisma.election.findFirst({ where: { status: 'open', activeWindowStart: { lte: new Date() }, activeWindowEnd: { gte: new Date() } } });
  // const isOpen = !overrideEnabled && activeElection !== null;

  return NextResponse.json({
    success: true,
    data: {
      isOpen: false,
      message:
        "The Voters' Guide submission system is currently closed for this election cycle.",
      overrideEnabled: false,
    },
  });
}
