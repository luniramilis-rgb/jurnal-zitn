import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, index, check } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

// In-app feedback (ZITN-TECH-017 §10.4, F0b). One row per submitted message,
// scoped to the user who sent it. `user_email` is a PII snapshot captured at
// submission time (the local mirror of the ZITN feedback posture) — it is
// exported with the user's own data and removed by the FK cascade on account
// deletion, alongside every other user-keyed row.
//
// `source` records which surface sent it (`jurnal` in-app, `lembar` daily
// sheet) and `status` is the admin triage state. Both are closed vocabularies;
// the CHECK constraints are the store-level guard behind the shared Zod enums.
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userEmail: varchar('user_email', { length: 255 }).notNull(),
    type: varchar('type', { length: 16 }).notNull(),
    message: text('message').notNull(),
    pageUrl: varchar('page_url', { length: 2048 }).notNull(),
    source: varchar('source', { length: 16 }).notNull().default('jurnal'),
    status: varchar('status', { length: 16 }).notNull().default('baru'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('feedback_user_id_idx').on(t.userId),
    index('feedback_status_created_idx').on(t.status, t.createdAt),
    check('feedback_type_chk', sql`${t.type} IN ('bug','feature','general','question')`),
    check('feedback_source_chk', sql`${t.source} IN ('jurnal','lembar')`),
    check(
      'feedback_status_chk',
      sql`${t.status} IN ('baru','ditinjau','direncanakan','selesai','ditolak')`,
    ),
  ],
);
