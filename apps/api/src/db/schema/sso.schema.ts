import { pgTable, varchar, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * SSO nonce ledger (ZITN-TECH-017, runtime A).
 *
 * The ZITN-issued token carries a `jti`; inserting it here is what makes the token
 * **single-use**. The `jti` is the primary key, so a replay hits a unique violation and
 * is rejected. Rows are pruned by `expires_at` (the token's own `exp`), so the table
 * stays bounded by the 120-second token TTL window.
 */
export const ssoConsumedTokens = pgTable(
  'sso_consumed_tokens',
  {
    jti: varchar('jti', { length: 128 }).primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sso_consumed_tokens_expires_at_idx').on(t.expiresAt)],
);
