import { and, eq } from 'drizzle-orm';

import type {
  CreateTradePlanInput,
  TradePlan,
  TradePlanMarket,
  TradePlanStatus,
  UpdateTradePlanInput,
} from '@jurnal-zitn/shared';

import { db } from '@/db';
import { tradePlans } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { withTransaction } from '@/lib/transaction';

// ---------------------------------------------------------------------------
// F4 pre-trade plans (ZITN-TECH-017 §10.8). ZITN-TECH-070 §3b: RPT is standalone
// (no position link). User-scoped CRUD with a forward-only lifecycle:
// Pending → Executed / Missed / Cancelled. Repeating a terminal state is
// idempotent; moving BETWEEN terminal states (or back to pending) is refused.
// `playbook_id` is a SOFT link (no FK) — deleting a playbook never cascades.
// ---------------------------------------------------------------------------

// A lifecycle write also records the user's `decision` (§3b), derived from the
// terminal state reached: executed → taken, cancelled → skipped, missed →
// no_action. `pending` leaves it null.
const DECISION_FOR_STATUS: Record<TradePlanStatus, 'taken' | 'skipped' | 'no_action' | null> = {
  pending: null,
  executed: 'taken',
  missed: 'no_action',
  cancelled: 'skipped',
};

const ALLOWED_TRANSITIONS: Record<TradePlanStatus, readonly TradePlanStatus[]> = {
  pending: ['pending', 'executed', 'missed', 'cancelled'],
  executed: ['executed'],
  missed: ['missed'],
  cancelled: ['cancelled'],
};

function toTradePlan(row: typeof tradePlans.$inferSelect): TradePlan {
  return {
    id: row.id,
    symbol: row.symbol,
    side: row.side as TradePlan['side'],
    market: row.market as TradePlan['market'],
    signalDate: row.signalDate ?? null,
    rule: row.rule,
    source: (row.source as TradePlan['source']) ?? null,
    entryPrice: row.entryPrice,
    stopLoss: row.stopLoss,
    targetPrice: row.targetPrice,
    note: row.note,
    decision: (row.decision as TradePlan['decision']) ?? null,
    playbookId: row.playbookId,
    status: row.status as TradePlanStatus,
    sizing: (row.sizing as TradePlan['sizing']) ?? null,
    praSnapshot: (row.praSnapshot as TradePlan['praSnapshot']) ?? null,
    outcome: (row.outcome as TradePlan['outcome']) ?? null,
    checklist: (row.checklist as TradePlan['checklist']) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTradePlans(
  userId: string,
  status?: TradePlanStatus,
): Promise<TradePlan[]> {
  const rows = await db
    .select()
    .from(tradePlans)
    .where(
      status
        ? and(eq(tradePlans.userId, userId), eq(tradePlans.status, status))
        : eq(tradePlans.userId, userId),
    )
    .orderBy(tradePlans.createdAt);
  return rows.map(toTradePlan);
}

export async function getTradePlan(userId: string, id: string): Promise<TradePlan> {
  const [row] = await db
    .select()
    .from(tradePlans)
    .where(and(eq(tradePlans.userId, userId), eq(tradePlans.id, id)))
    .limit(1);
  if (!row) throw new NotFoundError('TradePlan', id);
  return toTradePlan(row);
}

export async function createTradePlan(
  userId: string,
  input: CreateTradePlanInput,
): Promise<TradePlan> {
  return withTransaction(db, async (tx) => {
    const [row] = await tx
      .insert(tradePlans)
      .values({
        userId,
        symbol: input.symbol,
        side: input.side,
        market: input.market ?? 'id',
        signalDate: input.signalDate ?? null,
        rule: input.rule ?? null,
        source: input.source ?? null,
        entryPrice: input.entryPrice ?? null,
        stopLoss: input.stopLoss ?? null,
        targetPrice: input.targetPrice ?? null,
        note: input.note ?? null,
        decision: input.decision ?? null,
        playbookId: input.playbookId ?? null,
        sizing: input.sizing ?? null,
        praSnapshot: input.praSnapshot ?? null,
        outcome: input.outcome ?? null,
        checklist: input.checklist ?? null,
      })
      .returning();
    return toTradePlan(row!);
  });
}

/**
 * "Tambah ke Jurnal" dari Pemindai ZITN (ZITN-TECH-043): buat draf pra-trade **idempoten**.
 *
 * Bila sudah ada draf **Pending** untuk (user, symbol, market) yang sama, kembalikan yang itu
 * (fokuskan) alih-alih membuat duplikat. Draf terminal (executed/missed/cancelled) TIDAK
 * difokuskan — dibuat draf baru. Prefill hanya identitas: symbol + market + signalDate; sisi
 * default `long` (dapat diubah pengguna), **tanpa** zona/stop/target.
 */
export async function createOrFocusPendingPlan(
  userId: string,
  input: { symbol: string; market?: TradePlanMarket; signalDate?: string | null },
): Promise<{ plan: TradePlan; focused: boolean }> {
  const market: TradePlanMarket = input.market ?? 'id';
  return withTransaction(db, async (tx) => {
    const [existing] = await tx
      .select()
      .from(tradePlans)
      .where(
        and(
          eq(tradePlans.userId, userId),
          eq(tradePlans.symbol, input.symbol),
          eq(tradePlans.market, market),
          eq(tradePlans.status, 'pending'),
        ),
      )
      .limit(1);
    if (existing) return { plan: toTradePlan(existing), focused: true };

    const [row] = await tx
      .insert(tradePlans)
      .values({
        userId,
        symbol: input.symbol,
        side: 'long',
        market,
        signalDate: input.signalDate ?? null,
      })
      .returning();
    return { plan: toTradePlan(row!), focused: false };
  });
}

export async function updateTradePlan(
  userId: string,
  id: string,
  input: UpdateTradePlanInput,
): Promise<TradePlan> {
  return withTransaction(db, async (tx) => {
    const [row] = await tx
      .update(tradePlans)
      .set({
        ...(input.symbol !== undefined ? { symbol: input.symbol } : {}),
        ...(input.side !== undefined ? { side: input.side } : {}),
        ...(input.market !== undefined ? { market: input.market } : {}),
        ...(input.signalDate !== undefined ? { signalDate: input.signalDate } : {}),
        ...(input.rule !== undefined ? { rule: input.rule } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.entryPrice !== undefined ? { entryPrice: input.entryPrice } : {}),
        ...(input.stopLoss !== undefined ? { stopLoss: input.stopLoss } : {}),
        ...(input.targetPrice !== undefined ? { targetPrice: input.targetPrice } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.decision !== undefined ? { decision: input.decision } : {}),
        ...(input.playbookId !== undefined ? { playbookId: input.playbookId } : {}),
        ...(input.sizing !== undefined ? { sizing: input.sizing } : {}),
        ...(input.praSnapshot !== undefined ? { praSnapshot: input.praSnapshot } : {}),
        ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
        ...(input.checklist !== undefined ? { checklist: input.checklist } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(tradePlans.userId, userId), eq(tradePlans.id, id)))
      .returning();
    if (!row) throw new NotFoundError('TradePlan', id);
    return toTradePlan(row);
  });
}

/**
 * Lifecycle write. Refuses a transition between terminal states.
 */
export async function setTradePlanStatus(
  userId: string,
  id: string,
  status: TradePlanStatus,
): Promise<TradePlan> {
  return withTransaction(db, async (tx) => {
    const [existing] = await tx
      .select()
      .from(tradePlans)
      .where(and(eq(tradePlans.userId, userId), eq(tradePlans.id, id)))
      .limit(1);
    if (!existing) throw new NotFoundError('TradePlan', id);

    const from = existing.status as TradePlanStatus;
    if (!ALLOWED_TRANSITIONS[from].includes(status)) {
      throw new ValidationError(`Cannot move a trade plan from '${from}' to '${status}'`);
    }

    const [row] = await tx
      .update(tradePlans)
      .set({ status, decision: DECISION_FOR_STATUS[status], updatedAt: new Date() })
      .where(eq(tradePlans.id, id))
      .returning();
    return toTradePlan(row!);
  });
}

export async function deleteTradePlan(userId: string, id: string): Promise<void> {
  const deleted = await withTransaction(db, (tx) =>
    tx
      .delete(tradePlans)
      .where(and(eq(tradePlans.userId, userId), eq(tradePlans.id, id)))
      .returning({ id: tradePlans.id }),
  );
  if (deleted.length === 0) throw new NotFoundError('TradePlan', id);
}
