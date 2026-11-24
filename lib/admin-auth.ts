import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60;

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function verifyAdminPassword(candidate: unknown): boolean {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (typeof candidate !== "string" || !password || !secret) return false;

  const candidateDigest = createHmac("sha256", secret).update(candidate).digest();
  const passwordDigest = createHmac("sha256", secret).update(password).digest();
  return timingSafeEqual(candidateDigest, passwordDigest);
}

export function createAdminSession(
  secret = process.env.ADMIN_SESSION_SECRET,
  now = Date.now(),
): string | null {
  if (!secret) return null;

  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${expiresAt}.${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSession(
  token: string | undefined,
  secret = process.env.ADMIN_SESSION_SECRET,
  now = Date.now(),
): boolean {
  if (!token || !secret) return false;

  const [expiresAtText, nonce, signatureText, ...extra] = token.split(".");
  if (
    extra.length > 0
    || !/^\d+$/.test(expiresAtText)
    || !/^[A-Za-z0-9_-]{22}$/.test(nonce)
    || !/^[A-Za-z0-9_-]{43}$/.test(signatureText)
  ) return false;

  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;

  const payload = `${expiresAtText}.${nonce}`;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signatureText, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
