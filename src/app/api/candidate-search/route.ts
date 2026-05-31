import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const officeParam = searchParams.get("office") || searchParams.get("officeId") || undefined;
  const party = searchParams.get("party") || undefined;

  let officeWhere: any = undefined;
  if (officeParam) {
    const looksLikeUuid = /^[0-9a-f-]{20,}$/i.test(officeParam);
    if (looksLikeUuid) {
      officeWhere = { id: officeParam };
    } else {
      officeWhere = { label: { equals: officeParam, mode: "insensitive" } };
    }
  }

  try {
    const where: any = {
      status: "approved",
      AND: [],
    };

    if (officeWhere) {
      where.AND.push({ office: officeWhere });
    }

    if (party) {
      where.AND.push({ candidate: { party } });
    }

    if (query) {
      where.AND.push({
        OR: [
          { candidate: { officialFirstName: { contains: query, mode: "insensitive" } } },
          { candidate: { officialLastName: { contains: query, mode: "insensitive" } } },
          { office: { label: { contains: query, mode: "insensitive" } } },
        ],
      });
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        candidate: {
          select: {
            officialFirstName: true,
            officialLastName: true,
            party: true,
          },
        },
        office: {
          select: { label: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: submissions });
  } catch (e) {
    console.error("DEBUG: Prisma Candidate Search Error:", e);
    return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
  }
}
