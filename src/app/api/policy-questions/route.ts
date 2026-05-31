import { NextResponse } from "next/server";

// GET /api/policy-questions — List public policy question PDFs
const POLICY_QUESTIONS = [
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
  const data = POLICY_QUESTIONS.map(({ id, title, fileName, description }) => ({
    id,
    title,
    description,
    url: `/policy-questions/${fileName}`,
  }));

  return NextResponse.json({ success: true, data });
}
