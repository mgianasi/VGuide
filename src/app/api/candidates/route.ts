import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const submissions = await prisma.submission.findMany({
      where: { status: 'approved' },
      include: {
        candidate: {
          select: {
            officialFirstName: true,
            officialLastName: true,
            party: true,
          }
        },
        office: {
          select: { label: true }
        }
      },
    });

    return NextResponse.json({ success: true, data: submissions });
  } catch (e) {
    console.error("DEBUG: Prisma Search Error:", e);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}
