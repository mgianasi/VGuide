import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";

type CaptchaRecord = {
  answer: number;
  expiresAt: number;
};

export const captchaStore = new Map<string, CaptchaRecord>();
const TTL_MS = 5 * 60 * 1000;

function generateMathProblem() {
  let a = randomInt(10, 99);
  let b = randomInt(10, 99);
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

export async function GET() {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (record.expiresAt < now) captchaStore.delete(id);
  }

  const id = crypto.randomUUID();
  const { question, answer } = generateMathProblem();
  captchaStore.set(id, { answer, expiresAt: now + TTL_MS });
  return NextResponse.json({ captchaId: id, question, ttlSeconds: Math.floor(TTL_MS / 1000) });
}
