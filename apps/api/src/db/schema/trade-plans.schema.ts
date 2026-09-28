import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

// F4 — pre-trade plans (ZITN-TECH-017 §10.8). A plan's lifecycle is
// Pending → Executed / Missed / Cancelled. `playbook_id` and `position_id` are
// SOFT links (no FK): deleting a playbook or a trade must never cascade into the
// plan, it only leaves an id the app resolves or ignores.
export const TRADE_PLAN_STATUSES = ['pending', 'executed', 'missed', 'cancelled'] as const;

export const tradePlans = pgTable(
  'trade_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 32 }).notNull(),
    side: varchar('side', { length: 5 }).notNull(),
    thesis: text('thesis'),
    playbookId: uuid('playbook_id'),
    entryZoneLow: numeric('entry_zone_low', { precision: 18, scale: 8 }),
    entryZoneHigh: numeric('entry_zone_high', { precision: 18, scale: 8 }),
    stopLoss: numeric('stop_loss', { precision: 18, scale: 8 }),
    targetPrice: numeric('target_price', { precision: 18, scale: 8 }),
    status: varchar('status', { length: 12 }).notNull().default('pending'),
    positionId: uuid('position_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('trade_plans_user_id_idx').on(table.userId),
    index('trade_plans_user_id_status_idx').on(table.userId, table.status),
    check('trade_plans_side_chk', sql`${table.side} IN ('long','short')`),
    check(
      'trade_plans_status_chk',
      sql`${table.status} IN ('pending','executed','missed','cancelled')`,
    ),
  ],
);
