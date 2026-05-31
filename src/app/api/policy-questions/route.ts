import { NextResponse } from "next/server";

// GET /api/policy-questions — List public policy question PDFs
const QUESTION_FILES: Array<{ id: string; title: string; fileName: string; description?: string }> = [
  {
    id: "pq-1",
    title: "Public Policy Question 1",
    fileName: "question-1.pdf",
    description: "Example public policy question #1.",
  },
  {
    id: "pq-2",
    title: "Public Policy Question 2",
    fileName: "question-2.pdf",
    description: "Example public policy question #2.",
  },
];

export async function GET() {
  const items = QUESTION_FILES.map(({ id, title, fileName, description }) => ({
    id,
    title,
    description,
    fileName,
    url: `/policy-questions/${fileName}`,
  }));

  return NextResponse.json({ success: true, data: items });
}
