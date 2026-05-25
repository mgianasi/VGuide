// ══════════════════════════════════════════════
// VGuide — Authentication Library
// ══════════════════════════════════════════════
//
// Password hashing, JWT session management,
// TOTP MFA, and CAPTCHA verification.
// ══════════════════════════════════════════════

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import * as speakeasy from "speakeasy";

// ── Config ───────────────────────────────────
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "vguide-dev-secret-change-in-production-32char!",
);
const SESSION_COOKIE = "vguide_session";
const MFA_TOKEN_COOKIE = "vguide_mfa_pending";
const SESSION_DURATION = 60 * 60 * 24; // 24 hours in seconds
const MFA_TOKEN_DURATION = 60 * 5; // 5 minutes
const HASH_KEY_LENGTH = 64;
const HASH_SALT_LENGTH = 32;

// ── Types ────────────────────────────────────
export type SessionPayload = {
  sub: string; // account ID
  role: "candidate" | "admin";
  email: string;
  firstName: string;
  lastName: string;
};

export type MfaPendingPayload = {
  sub: string;
  exp: number;
};

// ── Password Hashing (scrypt) ────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(HASH_SALT_LENGTH).toString("hex");
  const derivedKey = scryptSync(password, salt, HASH_KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  const derivedKey = scryptSync(password, salt, HASH_KEY_LENGTH);
  const keyBuf = Buffer.from(key, "hex");
  const derivedBuf = Buffer.from(derivedKey);
  return timingSafeEqual(keyBuf, derivedBuf);
}

// ── JWT Session Management (jose) ────────────
export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function signMfaPendingToken(accountId: string): Promise<string> {
  return new SignJWT({ sub: accountId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MFA_TOKEN_DURATION}s`)
    .sign(JWT_SECRET);
}

export async function verifyMfaPendingToken(
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload as { sub: string }).sub;
  } catch {
    return null;
  }
}

// ── Cookie Helpers ───────────────────────────
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(MFA_TOKEN_COOKIE);
}

export async function setMfaPendingCookie(accountId: string): Promise<void> {
  const token = await signMfaPendingToken(accountId);
  const cookieStore = await cookies();
  cookieStore.set(MFA_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MFA_TOKEN_DURATION,
  });
}

export async function getMfaPendingAccountId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MFA_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyMfaPendingToken(token);
}

// ── TOTP MFA ─────────────────────────────────
export function generateMfaSecret(): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = speakeasy.generateSecret({
    name: "IL Voters Guide",
    issuer: "IL Voters Guide",
  });
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url ?? "",
  };
}

export function verifyMfaToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}

// ── CAPTCHA (Cloudflare Turnstile) ───────────
export async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Bypass if not configured
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      },
    );
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
