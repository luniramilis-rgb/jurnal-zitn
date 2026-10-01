/**
 * ZITN SSO exchange (ZITN-TECH-017, runtime A).
 *
 * ZITN is the identity provider. It mints a short-lived, single-use, HMAC-signed token
 * (`purpose: journal_sso`) after checking the user's ZITN session and entitlement; this
 * service verifies it, consumes its `jti` once, resolves/creates the journal account,
 * and issues a normal journal session cookie (done by the route).
 *
 * Fail-closed: without `JOURNAL_SSO_SECRET` (`isSsoConfigured()`) every call is refused.
 */

import crypto from 'node:crypto';

import bcrypt from 'bcrypt';

import { DEFAULT_SIGNUP_TIMEZONE } from '@jurnal-zitn/shared';

import { db } from '@/db';
import { config, isSsoConfigured } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { insertUser, selectUserByEmail } from './auth.query';
import { createSessionForUser } from './auth.service';
import { verifySsoToken, type SsoPayload } from './sso-token';
import {
  consumeJti,
  deleteExpiredSsoTokens,
  linkUserZitnId,
  selectUserByZitnId,
  setUserEntitlement,
} from './sso.query';

const BCRYPT_COST = 10;

/** SSO accounts never use a password; the hash is of 32 random bytes and unknowable. */
async function unusablePasswordHash(): Promise<string> {
  return bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_COST);
}

/**
 * Resolve the journal account for a verified ZITN payload, creating it on first login.
 * Order: exact `zitnUserId` link → email match (link the row once) → create.
 */
async function resolveUser(payload: SsoPayload): Promise<{ id: string; created: boolean }> {
  const linked = await selectUserByZitnId(db, payload.uid);
  if (linked) return { id: linked.id, created: false };

  const email = (payload.email ?? '').trim();
  if (email) {
    const byEmail = await selectUserByEmail(db, email);
    if (byEmail) {
      if (!byEmail.zitnUserId) await linkUserZitnId(db, byEmail.id, payload.uid);
      return { id: byEmail.id, created: false };
    }
  } else {
    // A brand-new account cannot be created without an email (users.email NOT NULL).
    throw new AppError(400, 'SSO_EMAIL_REQUIRED', 'SSO token has no email to create an account.');
  }

  const created = await insertUser(db, {
    email,
    passwordHash: await unusablePasswordHash(),
    emailVerified: true,
    timezone: DEFAULT_SIGNUP_TIMEZONE,
    zitnUserId: payload.uid,
  });
  return { id: created.id, created: true };
}

export interface SsoExchangeResult {
  userId: string;
  token: string;
}

/** Verify, consume the nonce, resolve the user, and issue a journal session token. */
export async function exchangeSsoToken(rawToken: unknown): Promise<SsoExchangeResult> {
  if (!isSsoConfigured()) {
    throw new AppError(503, 'SSO_DISABLED', 'ZITN SSO is not configured on this instance.');
  }

  const payload = verifySsoToken(rawToken, config.JOURNAL_SSO_SECRET as string);
  if (!payload) {
    throw new AppError(401, 'SSO_TOKEN_INVALID', 'Invalid, tampered, or expired SSO token.');
  }

  const fresh = await consumeJti(db, payload.jti, new Date(payload.exp));
  if (!fresh) {
    // Replay: this jti was already exchanged. Reject without touching the account.
    throw new AppError(401, 'SSO_TOKEN_REPLAYED', 'SSO token has already been used.');
  }

  const user = await resolveUser(payload);
  // Simpan entitlement dari token SSO (Fase 4). ISO tak sah -> null (tidak berhak; fail-closed).
  const entMs = typeof payload.ent === 'string' ? Date.parse(payload.ent) : Number.NaN;
  await setUserEntitlement(db, user.id, Number.isFinite(entMs) ? new Date(entMs) : null);
  const token = await createSessionForUser(user.id);

  // Best-effort prune of expired nonces; never fails the login.
  void deleteExpiredSsoTokens(db).catch(() => {});

  logger.info('sso_login', { userId: user.id, created: user.created });
  return { userId: user.id, token };
}
