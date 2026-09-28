import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

// F4 — strategy playbooks (ZITN-TECH-017 §10.8). A user's written setup: rules,
// entry trigger, exit criteria, timeframe and instrument. Per-setup statistics
// are computed at READ time by joining trades on `positions.playbook_id` (a soft
// link, no FK), never stored here.
export const playbooks = pgTable(
  'playbooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    setupRules: text('setup_rules'),
    entryTrigger: text('entry_trigger'),
    exitCriteria: text('exit_criteria'),
    timeframe: varchar('timeframe', { length: 32 }),
    instrument: varchar('instrument', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('playbooks_user_id_idx').on(table.userId)],
);
