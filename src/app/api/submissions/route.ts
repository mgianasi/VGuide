import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── GET /api/submissions — List open elections and offices for the form ──
export async function GET() {
  try {
    const [elections, offices] = await Promise.all([
      prisma.election.findMany({
        where: { status: "open" },
        select: { id: true, label: true, cycleYear: true, electionType: true },
        orderBy: { cycleYear: "desc" },
      }),
      prisma.office.findMany({
        select: { id: true, label: true, category: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({ success: true, elections, offices });
  } catch (error) {
    console.error("Error fetching form data:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST /api/submissions — Create a new submission ──
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      electionId,
      officeId,
      languageCode,
      contactAddress,
      contactZipCode,
      contactPhone,
      contactFax,
      contactEmail,
      contactWebsite,
      candidateStatement,
      biographicalInfo,
    } = body;

    // ── Validate required fields ───────────────
    if (!electionId || !officeId || !languageCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Election, office, and language are required",
        },
        { status: 400 }
      );
    }

    // ── Find the candidate record for this account ──
    const candidate = await prisma.candidate.findUnique({
      where: { accountId: session.sub },
    });

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    // ── Create the submission ───────────────────
    const submission = await prisma.submission.create({
      data: {
        electionId,
        candidateId: candidate.id,
        officeId,
        languageCode,
        contactAddress: contactAddress ?? null,
        contactZipCode: contactZipCode ?? null,
        contactPhone: contactPhone ?? null,
        contactFax: contactFax ?? null,
        contactEmail: contactEmail ?? null,
        contactWebsite: contactWebsite ?? null,
        candidateStatement: candidateStatement ?? null,
        biographicalInfo: biographicalInfo ?? null,
      },
      include: {
        election: { select: { label: true } },
        office: { select: { label: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: submission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}