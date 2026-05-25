import { NextResponse } from "next/server";

// GET /api/policy-questions — List policy question PDFs
export async function GET() {
  // In production:
  // const policies = await prisma.policyQuestion.findMany({ where: { isPublished: true }, orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({
    success: true,
    data: [],
    message: "Endpoint ready. Connect Prisma to populate data.",
  });
}
