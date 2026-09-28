import Decimal from 'decimal.js';
import { and, eq, sql } from 'drizzle-orm';

import type {
  CreatePlaybookInput,
  PerformanceStats,
  Playbook,
  PlaybookSetupStats,
  UpdatePlaybookInput,
} from '@jurnal-zitn/shared';
import {
  classifyPosition,
  computePositionSetStatistics,
  type ClassifiedPosition,
} from '@jurnal-zitn/shared/lib/performance';

import { db } from '@/db';
import { playbooks } from '@/db/schema';
import { NotFoundError } from '@/lib/errors';
import { withTransaction } from '@/lib/transaction';

// ---------------------------------------------------------------------------
// F4 playbooks (ZITN-TECH-017 §10.8). User-scoped CRUD. Per-setup statistics are
// computed at READ time by joining trades on `positions.playbook_id`, a SOFT
// link (no FK): a deleted playbook leaves its trades intact and they fold into
// the `null` / unassigned bucket.
//
// Reproduces bucket A: uses the LATCHED flat P&L (`last_flat_net_pnl`) that the
// performance feature uses for completed trades. Positions that go flat but
// predate the latch (no latched P&L) are not counted here.
// ---------------------------------------------------------------------------

function toPlaybook(row: {
  id: string;
  name: string;
  setupRules: string | null;
  entryTrigger: string | null;
  exitCriteria: string | null;
  timeframe: string | null;
  instrument: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Playbook {
  return {
    id: row.id,
    name: row.name,
    setupRules: row.setupRules,
    entryTrigger: row.entryTrigger,
    exitCriteria: row.exitCriteria,
    timeframe: row.timeframe,
    instrument: row.instrument,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const COLUMNS = {
  id: playbooks.id,
  name: playbooks.name,
  setupRules: playbooks.setupRules,
  entryTrigger: playbooks.entryTrigger,
  exitCriteria: playbooks.exitCriteria,
  timeframe: playbooks.timeframe,
  instrument: playbooks.instrument,
  createdAt: playbooks.createdAt,
  updatedAt: playbooks.updatedAt,
};

export async function listPlaybooks(userId: string): Promise<Playbook[]> {
  const rows = await db
    .select(COLUMNS)
    .from(playbooks)
    .where(eq(playbooks.userId, userId))
    .orderBy(playbooks.name);
  return rows.map(toPlaybook);
}

export async function getPlaybook(userId: string, id: string): Promise<Playbook> {
  const [row] = await db
    .select(COLUMNS)
    .from(playbooks)
    .where(and(eq(playbooks.userId, userId), eq(playbooks.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('Playbook', id);
  return toPlaybook(row);
}

export async function createPlaybook(
  userId: string,
  input: CreatePlaybookInput,
): Promise<Playbook> {
  return withTransaction(db, async (tx) => {
    const [row] = await tx
      .insert(playbooks)
      .values({
        userId,
        name: input.name,
        setupRules: input.setupRules ?? null,
        entryTrigger: input.entryTrigger ?? null,
        exitCriteria: input.exitCriteria ?? null,
        timeframe: input.timeframe ?? null,
        instrument: input.instrument ?? null,
      })
      .returning(COLUMNS);
    return toPlaybook(row!);
  });
}

export async function updatePlaybook(
  userId: string,
  id: string,
  input: UpdatePlaybookInput,
): Promise<Playbook> {
  return withTransaction(db, async (tx) => {
    const [row] = await tx
      .update(playbooks)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.setupRules !== undefined ? { setupRules: input.setupRules } : {}),
        ...(input.entryTrigger !== undefined ? { entryTrigger: input.entryTrigger } : {}),
        ...(input.exitCriteria !== undefined ? { exitCriteria: input.exitCriteria } : {}),
        ...(input.timeframe !== undefined ? { timeframe: input.timeframe } : {}),
        ...(input.instrument !== undefined ? { instrument: input.instrument } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(playbooks.userId, userId), eq(playbooks.id, id)))
      .returning(COLUMNS);
    if (!row) throw new NotFoundError('Playbook', id);
    return toPlaybook(row);
  });
}

/**
 * Hard-deletes the playbook row only. Trades keep their (now dangling)
 * `playbook_id` — the soft-link contract — and fold into the unassigned bucket.
 */
export async function deletePlaybook(userId: string, id: string): Promise<void> {
  const deleted = await withTransaction(db, (tx) =>
    tx
      .delete(playbooks)
      .where(and(eq(playbooks.userId, userId), eq(playbooks.id, id)))
      .returning({ id: playbooks.id }),
  );
  if (deleted.length === 0) throw new NotFoundError('Playbook', id);
}

interface StatsRow {
  playbook_id: string | null;
  last_flat_net_pnl: string;
  currency: string;
}

/**
 * Per-setup statistics computed at read time. Groups the user's latched flat
 * trades by `playbook_id`; ids that no longer resolve to a playbook (deleted)
 * fall into the same `null` bucket as trades that never had one. Ordered
 * unassigned-last, then by name.
 */
export async function getPlaybookStats(
  userId: string,
  currency: string,
): Promise<PlaybookSetupStats[]> {
  const rows = await db
    .select({
      playbookId: playbooks.id,
      name: playbooks.name,
    })
    .from(playbooks)
    .where(eq(playbooks.userId, userId));
  const nameById = new Map(rows.map((r) => [r.playbookId, r.name]));

  const positions = await db.execute<Record<string, unknown>>(sql`
    SELECT p.playbook_id, p.last_flat_net_pnl, a.currency
    FROM positions p
    JOIN accounts a ON a.id = p.account_id AND a.user_id = p.user_id
    WHERE p.user_id = ${userId}
      AND p.last_flat_at IS NOT NULL
      AND p.last_flat_net_pnl IS NOT NULL
      AND a.currency = ${currency}
  `);

  const grouped = new Map<string | null, ClassifiedPosition[]>();
  const rawRows = positions as unknown as StatsRow[];
  for (const row of rawRows) {
    // A dangling id (deleted playbook) folds into the unassigned bucket.
    const key = row.playbook_id !== null && nameById.has(row.playbook_id) ? row.playbook_id : null;
    const netPnl = new Decimal(row.last_flat_net_pnl);
    const classified: ClassifiedPosition = {
      id: '',
      currency: row.currency,
      netPnl,
      grossPnl: netPnl,
      fees: new Decimal(0),
      closedAt: new Date(0),
      classification: classifyPosition(netPnl, row.currency),
    };
    const list = grouped.get(key);
    if (list) list.push(classified);
    else grouped.set(key, [classified]);
  }

  const items: PlaybookSetupStats[] = [];
  for (const row of rows) {
    const stats: PerformanceStats = computePositionSetStatistics(grouped.get(row.playbookId) ?? []);
    items.push({ playbookId: row.playbookId, name: row.name, stats });
  }
  const unassigned = grouped.get(null) ?? [];
  if (unassigned.length > 0) {
    items.push({ playbookId: null, name: null, stats: computePositionSetStatistics(unassigned) });
  }
  // Unassigned last; the rest already come name-ordered.
  items.sort((a, b) => (a.playbookId === null ? 1 : b.playbookId === null ? -1 : 0));
  return items;
}
