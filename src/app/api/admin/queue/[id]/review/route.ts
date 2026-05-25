import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── POST /api/admin/queue/[id]/review — Approve/Deny/Request Changes ──
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    if (!action || !["approve", "deny", "request_changes"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be: approve, deny, or request_changes" },
        { status: 400 }
      );
    }

    // Fetch the submission with current state
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    // Map actions to statuses
    const statusMap: Record<string, string> = {
      approve: "approved",
      deny: "denied",
      request_changes: "changes_requested",
    };

    const newStatus = statusMap[action];
    const previousStatus = submission.status;

    // Update submission in a transaction with audit log
    await prisma.$transaction(async (tx) => {
      // Update the submission status
      await tx.submission.update({
        where: { id },
        data: {
          status: newStatus as any,
          reviewedBy: session.sub,
          reviewedAt: new Date(),
          reviewerNotes: notes ?? null,
        },
      });

      // Create audit log entry
      const actionMap: Record<string, string> = {
        approve: "submission_approved",
        deny: "submission_denied",
        request_changes: "changes_requested",
      };

      await tx.adminLog.create({
        data: {
          submissionId: id,
          adminId: session.sub,
          action: actionMap[action] as any,
          previousStatus: previousStatus as any,
          newStatus: newStatus as any,
          notes: notes ?? null,
        },
      });

      // If approving, check if there's a previously approved submission
      // for the same candidate+election+office+language that should be superseded
      if (action === "approve") {
        const fullSubmission = await tx.submission.findUnique({
          where: { id },
          select: { candidateId: true, electionId: true, officeId: true, languageCode: true },
        });

        if (fullSubmission) {
          const previousApproved = await tx.submission.findFirst({
            where: {
              candidateId: fullSubmission.candidateId,
              electionId: fullSubmission.electionId,
              officeId: fullSubmission.officeId,
              languageCode: fullSubmission.languageCode,
              status: "approved",
              id: { not: id },
            },
          });

          if (previousApproved) {
            await tx.submission.update({
              where: { id: previousApproved.id },
              data: {
                status: "superseded",
                updatedAt: new Date(),
              },
            });

            await tx.adminLog.create({
              data: {
                submissionId: previousApproved.id,
                adminId: session.sub,
                action: "submission_approved" as any,
                previousStatus: "approved" as any,
                newStatus: "superseded" as any,
                notes: "Auto-superseded by new approval",
              },
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Submission ${action === "approve" ? "approved" : action === "deny" ? "denied" : "sent back for changes"}`,
    });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}