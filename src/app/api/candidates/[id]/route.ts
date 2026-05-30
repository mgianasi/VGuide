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
      where: { id: id },
      include: {
        candidate: {
          select: {
            officialFirstName: true,
            officialLastName: true,
            party: true,
            campaignWebsite: true,
          }
        },
        office: {
          select: {
            label: true
          }
        },
      },
    });

    if (!submission) {
      console.log(`DEBUG: Submission not found for ID: ${id}`);
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    // Explicitly destructure for debugging output
    console.log("DEBUG: Submission found:", JSON.stringify(submission, null, 2));

    return NextResponse.json({ success: true, data: submission });
  } catch (e) {
    console.error("DEBUG: Prisma error:", e);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}
