import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/elections — List all elections ──
export async function GET() {
  try {
    const elections = await prisma.election.findMany({
      select: {
        id: true,
        label: true,
        cycleYear: true,
        electionType: true,
        status: true,
      },
      orderBy: { cycleYear: "desc" },
    });

    return NextResponse.json({ success: true, data: elections });
  } catch (error) {
    console.error("Error fetching elections:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
