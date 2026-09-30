/**
 * Verifikasi token SSO sekali-pakai dari ZITN (ZITN-TECH-017, runtime A).
 *
 * Format **byte-compatible** dengan `functions/lib/session.mjs` di ZITN:
 *
 *   base64url(utf8(JSON(payload)))  "."  base64url(HMAC-SHA256(secret, body))
 *
 * Payload yang diharapkan: `{ purpose: 'journal_sso', uid, email?, iat?, exp, jti }`.
 *
 * Modul ini MURNI (tanpa DB) supaya bisa diuji tanpa Postgres; konsumsi `jti`
 * sekali-pakai dilakukan di `sso.query.ts`.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const SSO_PURPOSE = 'journal_sso';
const MAX_TOKEN_CHARS = 4096;

export interface SsoPayload {
  purpose: string;
  uid: string;
  email?: string | null;
  /** Entitlement (ZITN-TECH-029 Fase 4): ISO akhir langganan, atau null. */
  ent?: string | null;
  iat?: number;
  exp: number;
  jti: string;
}

function hmacBase64url(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

/**
 * Menandatangani payload dengan format yang sama. Dipakai uji & interop;
 * produksi hanya memVERIFIKASI (ZITN yang menerbitkan).
 */
export function signSsoToken(payload: SsoPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${hmacBase64url(secret, body)}`;
}

/**
 * Verifikasi tanda tangan + bentuk payload + kedaluwarsa.
 * @returns payload bila sah; `null` bila tanda tangan salah, kedaluwarsa, atau bentuknya cacat.
 */
export function verifySsoToken(
  value: unknown,
  secret: string,
  nowMs: number = Date.now(),
): SsoPayload | null {
  if (!secret || typeof value !== 'string' || value.length > MAX_TOKEN_CHARS) return null;
  const dot = value.indexOf('.');
  if (dot <= 0 || dot === value.length - 1) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = hmacBase64url(secret, body);
  if (expected.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const p = parsed as Record<string, unknown>;
  if (p.purpose !== SSO_PURPOSE) return null;
  if (typeof p.uid !== 'string' || p.uid.length === 0 || p.uid.length > 64) return null;
  if (typeof p.jti !== 'string' || p.jti.length < 8 || p.jti.length > 128) return null;
  if (typeof p.exp !== 'number' || !Number.isFinite(p.exp) || p.exp <= nowMs) return null;
  if (p.email !== undefined && p.email !== null && typeof p.email !== 'string') return null;
  if (p.ent !== undefined && p.ent !== null && typeof p.ent !== 'string') return null;
  if (p.iat !== undefined && (typeof p.iat !== 'number' || !Number.isFinite(p.iat))) return null;

  return {
    purpose: p.purpose,
    uid: p.uid,
    email: (p.email as string | null | undefined) ?? null,
    ent: (p.ent as string | null | undefined) ?? null,
    iat: p.iat as number | undefined,
    exp: p.exp,
    jti: p.jti,
  };
}
