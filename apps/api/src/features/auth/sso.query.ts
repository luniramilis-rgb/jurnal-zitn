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
