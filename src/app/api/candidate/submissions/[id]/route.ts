import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── GET /api/candidate/submissions/[id] — Full detail + admin logs ──
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Find the candidate linked to this account
    const candidate = await prisma.candidate.findUnique({
      where: { accountId: session.sub },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 },
      );
    }

    // Fetch the submission — must belong to this candidate
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        candidateId: true,
        status: true,
        submissionDate: true,
        languageCode: true,
        candidateStatement: true,
        biographicalInfo: true,
        contactAddress: true,
        contactZipCode: true,
        contactPhone: true,
        contactFax: true,
        contactEmail: true,
        contactWebsite: true,
        profilePictureUrl: true,
        reviewerNotes: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        election: {
          select: { id: true, label: true, cycleYear: true, electionType: true },
        },
        office: {
          select: { id: true, label: true, category: true },
        },
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
            campaignWebsite: true,
            generalInformation: true,
          },
        },
        reviewer: {
          select: { displayName: true },
        },
        logs: {
          select: {
            id: true,
            action: true,
            notes: true,
            previousStatus: true,
            newStatus: true,
            createdAt: true,
            admin: { select: { displayName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 },
      );
    }

    // Security: ensure this submission belongs to the authenticated candidate
    if (submission.candidateId !== candidate.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, data: submission });
  } catch (error) {
    console.error("Candidate submission detail error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PUT /api/candidate/submissions/[id] — Edit + Resubmit ──
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Find the candidate linked to this account
    const candidate = await prisma.candidate.findUnique({
      where: { accountId: session.sub },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 },
      );
    }

    // Fetch the submission — verify ownership + editable status
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: { id: true, candidateId: true, status: true },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 },
      );
    }

    if (submission.candidateId !== candidate.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    // Only allow edits when status allows it
    const editableStatuses = ["changes_requested", "pending_review"];
    if (!editableStatuses.includes(submission.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot edit a submission with status "${submission.status}". Only "changes_requested" or "pending_review" submissions can be edited.`,
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const wasChangesRequested = submission.status === "changes_requested";

    // Editable fields
    const updateData: Record<string, unknown> = {};

    if (body.candidateStatement !== undefined)
      updateData.candidateStatement = body.candidateStatement;
    if (body.biographicalInfo !== undefined)
      updateData.biographicalInfo = body.biographicalInfo;
    if (body.contactAddress !== undefined)
      updateData.contactAddress = body.contactAddress;
    if (body.contactZipCode !== undefined)
      updateData.contactZipCode = body.contactZipCode;
    if (body.contactPhone !== undefined)
      updateData.contactPhone = body.contactPhone;
    if (body.contactFax !== undefined)
      updateData.contactFax = body.contactFax;
    if (body.contactEmail !== undefined)
      updateData.contactEmail = body.contactEmail;
    if (body.contactWebsite !== undefined)
      updateData.contactWebsite = body.contactWebsite;
    if (body.profilePictureUrl !== undefined)
      updateData.profilePictureUrl = body.profilePictureUrl;

    // If resubmitting from changes_requested, reset to pending_review
    if (wasChangesRequested) {
      updateData.status = "pending_review";
      updateData.reviewerNotes = null;
      updateData.reviewedBy = null;
      updateData.reviewedAt = null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id },
        data: updateData,
      });

      // Log the resubmission
      if (wasChangesRequested) {
        await tx.adminLog.create({
          data: {
            submissionId: id,
            adminId: undefined, // candidate action — no admin account
            action: "submission_resubmitted",
            previousStatus: "changes_requested",
            newStatus: "pending_review",
            notes: body.resubmissionNote ?? null,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: wasChangesRequested
        ? "Changes submitted for review"
        : "Submission updated",
    });
  } catch (error) {
    console.error("Candidate submission update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}