import { eq, lt, sql } from 'drizzle-orm';

import type { Database, Transaction } from '@/db';
import { ssoConsumedTokens, users } from '@/db/schema';

type DB = Database | Transaction;
type UserRow = typeof users.$inferSelect;

/** Find the journal account already linked to a ZITN user id. */
export function selectUserByZitnId(db: DB, zitnUserId: string): Promise<UserRow | undefined> {
  return db
    .select()
    .from(users)
    .where(eq(users.zitnUserId, zitnUserId))
    .limit(1)
    .then((rows) => rows[0]);
}

/** Link a pre-existing email account to a ZITN user id (one-time, when unset). */
export function linkUserZitnId(db: DB, userId: string, zitnUserId: string) {
  return db.update(users).set({ zitnUserId, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Simpan entitlement dari SSO (ZITN-TECH-029 Fase 4); `null` = tidak berhak. */
export function setUserEntitlement(db: DB, userId: string, until: Date | null) {
  return db
    .update(users)
    .set({ entitledUntil: until, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Akhir entitlement pengguna (null bila tak pernah diisi / tidak berhak). */
export async function selectEntitlementByUserId(db: DB, userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ entitledUntil: users.entitledUntil })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.entitledUntil ?? null;
}

/**
 * ZITN user id linked to a journal account (`null` when the row predates SSO).
 * Dipakai jembatan konteks: hanya akun yang datang lewat SSO ZITN yang boleh membaca lembar.
 */
export function selectZitnIdByUserId(db: DB, userId: string): Promise<string | null> {
  return db
    .select({ zitnUserId: users.zitnUserId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]?.zitnUserId ?? null);
}

/**
 * Atomically consume a one-time `jti`.
 *
 * `INSERT … ON CONFLICT DO NOTHING RETURNING` is the whole single-use guarantee: the
 * `jti` is the primary key, so a replay inserts no row and this resolves `false`. A
 * check-then-insert would race two simultaneous exchanges.
 */
export function consumeJti(db: DB, jti: string, expiresAt: Date): Promise<boolean> {
  return db
    .insert(ssoConsumedTokens)
    .values({ jti, expiresAt })
    .onConflictDoNothing()
    .returning({ jti: ssoConsumedTokens.jti })
    .then((rows) => rows.length > 0);
}

/** Prune consumed nonces past their token expiry (bounded table). */
export function deleteExpiredSsoTokens(db: DB) {
  return db.delete(ssoConsumedTokens).where(lt(ssoConsumedTokens.expiresAt, sql`now()`));
}
