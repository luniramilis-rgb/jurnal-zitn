import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

// F4 — pre-trade plans (ZITN-TECH-017 §10.8). ZITN-TECH-070 §3b: RPT is
// standalone (no `position_id`), one `entry_price` (no zone), one `note`
// (replaces `thesis`), plus `rule`/`source`/`decision` and the
// `sizing`/`pra_snapshot`/`outcome` snapshots. `playbook_id` stays a SOFT link
// (no FK): deleting a playbook must never cascade into the plan.
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
    // Prefill dari Pemindai ZITN (ZITN-TECH-043): pasar + tanggal sinyal/lembar. `market`
    // default 'id' agar draf lama tetap sah; `signal_date` nullable (draf manual boleh kosong).
    market: varchar('market', { length: 4 }).notNull().default('id'),
    signalDate: date('signal_date'),
    // Konteks (ZITN-TECH-070 §3b): rule yang dipakai (V6/V7/cross10), asal draf.
    rule: varchar('rule', { length: 32 }),
    source: varchar('source', { length: 12 }),
    // Rencana harga: SATU harga masuk (menggantikan zona low/high).
    entryPrice: numeric('entry_price', { precision: 18, scale: 8 }),
    stopLoss: numeric('stop_loss', { precision: 18, scale: 8 }),
    targetPrice: numeric('target_price', { precision: 18, scale: 8 }),
    // Catatan: satu `note` (menggantikan `thesis`).
    note: text('note'),
    // Keputusan pengguna (taken/skipped/no_action), terpisah dari lifecycle `status`.
    decision: varchar('decision', { length: 12 }),
    status: varchar('status', { length: 12 }).notNull().default('pending'),
    playbookId: uuid('playbook_id'),
    // Snapshot (ZITN-TECH-070 §3b): sizing dari Hitung Posisi, angka `pra` (Lapis 1) + asOf,
    // dan hasil minimal. Disimpan sebagai JSON apa adanya.
    sizing: jsonb('sizing'),
    praSnapshot: jsonb('pra_snapshot'),
    outcome: jsonb('outcome'),
    // Ceklis pra-trade (ZITN-TECH-069 Lapis 2): jawaban centang + attestasi + catatan,
    // disimpan apa adanya (JSON). Angka `pra` sendiri TIDAK di sini — dibaca dari konteks.
    checklist: jsonb('checklist'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('trade_plans_user_id_idx').on(table.userId),
    index('trade_plans_user_id_status_idx').on(table.userId, table.status),
    check('trade_plans_side_chk', sql`${table.side} IN ('long','short')`),
    check('trade_plans_market_chk', sql`${table.market} IN ('id','us')`),
    check(
      'trade_plans_status_chk',
      sql`${table.status} IN ('pending','executed','missed','cancelled')`,
    ),
    check(
      'trade_plans_source_chk',
      sql`${table.source} IS NULL OR ${table.source} IN ('pemindai','chart','manual')`,
    ),
    check(
      'trade_plans_decision_chk',
      sql`${table.decision} IS NULL OR ${table.decision} IN ('taken','skipped','no_action')`,
    ),
  ],
);
