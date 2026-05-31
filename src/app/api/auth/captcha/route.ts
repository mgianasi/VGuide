import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";

type CaptchaRecord = {
  answer: number;
  expiresAt: number;
};

export const captchaStore = new Map<string, CaptchaRecord>();
const TTL_MS = 5 * 60 * 1000;

function generateMathProblem() {
  let a = randomInt(10, 49);
  let b = randomInt(10, 49);
  const ops = ["+", "-", "×"] as const;
  const op = ops[randomInt(0, ops.length - 1)];
  let answer = 0;
  if (op === "-" && a < b) {
    [a, b] = [b, a];
  }
  const question = `${a} ${op} ${b}`;
  switch (op) {
    case "+":
      answer = a + b;
      break;
    case "-":
      answer = a - b;
      break;
    case "×":
      answer = a * b;
      break;
  }
  return { question, answer };
}

function cleanupExpired() {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (record.expiresAt < now) captchaStore.delete(id);
  }
}

// ── GET new challenge ──────────────────────────
export async function GET() {
  cleanupExpired();
  const id = crypto.randomUUID();
  const { question, answer } = generateMathProblem();
  captchaStore.set(id, { answer, expiresAt: Date.now() + TTL_MS });
  return NextResponse.json({ captchaId: id, question });
}

// ── POST verify answer ─────────────────────────
export async function POST(request: Request) {
  cleanupExpired();
  try {
    const body = await request.json();
    const captchaId = typeof body?.captchaId === "string" ? body.captchaId : "";
    const answer = Number(body?.answer);
    if (!captchaId || !Number.isFinite(answer)) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }
    const record = captchaStore.get(captchaId);
    if (!record || record.expiresAt < Date.now() || record.answer !== answer) {
      return NextResponse.json(
        { success: false, error: "Incorrect or expired CAPTCHA" },
        { status: 400 },
      );
    }
    captchaStore.delete(captchaId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }
}
