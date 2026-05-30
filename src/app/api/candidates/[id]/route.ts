import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log(`DEBUG: Attempting to fetch submission with ID: ${id}`);
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        candidate: true,
        office: true,
      },
    });

    if (!submission) {
      console.log(`DEBUG: Submission not found for ID: ${id}`);
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: submission });
  } catch (e) {
    console.error("DEBUG: Prisma error:", e);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}
