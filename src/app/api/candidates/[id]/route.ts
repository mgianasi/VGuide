import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: id },
      include: {
        candidate: {
          select: {
            officialFirstName: true,
            officialLastName: true,
            campaignName: true,
            party: true,
            education: true,
            currentEmployment: true,
            age: true,
            campaignAddress: true,
            campaignZipCode: true,
            campaignWebsite: true,
            generalInformation: true,
            campaignPhoneNumber: true,
          },
        },
        office: {
          select: { label: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: submission });
  } catch (e) {
    console.error("DEBUG: Prisma error:", e);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}
