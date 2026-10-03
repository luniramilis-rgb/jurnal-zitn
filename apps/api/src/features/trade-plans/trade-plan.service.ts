import { and, eq } from 'drizzle-orm';

import type {
  CreateTradePlanInput,
  TradePlan,
  TradePlanMarket,
  TradePlanStatus,
  UpdateTradePlanInput,
} from '@jurnal-zitn/shared';

import { db } from '@/db';
import { positions, tradePlans } from '@/db/schema';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { withTransaction } from '@/lib/transaction';

// ---------------------------------------------------------------------------
// F4 pre-trade plans (ZITN-TECH-017 §10.8). User-scoped CRUD with a forward-only
// lifecycle: Pending → Executed / Missed / Cancelled. Repeating a terminal state
// is idempotent; moving BETWEEN terminal states (or back to pending) is refused.
// `playbook_id` / `position_id` are SOFT links (no FK) — deleting a playbook or
// a trade never cascades into the plan.
// ---------------------------------------------------------------------------

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
    thesis: row.thesis,
    playbookId: row.playbookId,
    entryZoneLow: row.entryZoneLow,
    entryZoneHigh: row.entryZoneHigh,
    stopLoss: row.stopLoss,
    targetPrice: row.targetPrice,
    status: row.status as TradePlanStatus,
    positionId: row.positionId,
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
        thesis: input.thesis ?? null,
        playbookId: input.playbookId ?? null,
        entryZoneLow: input.entryZoneLow ?? null,
        entryZoneHigh: input.entryZoneHigh ?? null,
        stopLoss: input.stopLoss ?? null,
        targetPrice: input.targetPrice ?? null,
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
        ...(input.thesis !== undefined ? { thesis: input.thesis } : {}),
        ...(input.playbookId !== undefined ? { playbookId: input.playbookId } : {}),
        ...(input.entryZoneLow !== undefined ? { entryZoneLow: input.entryZoneLow } : {}),
        ...(input.entryZoneHigh !== undefined ? { entryZoneHigh: input.entryZoneHigh } : {}),
        ...(input.stopLoss !== undefined ? { stopLoss: input.stopLoss } : {}),
        ...(input.targetPrice !== undefined ? { targetPrice: input.targetPrice } : {}),
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
      .set({ status, updatedAt: new Date() })
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

/**
 * F4 — link a plan to the trade it produced (1:1), or unlink with `null`. The
 * position must be the caller's, and no other plan may already link that trade.
 * Attaching a Pending plan marks it Executed; detaching an Executed plan returns
 * it to Pending. Soft link: the id is stored without an FK, so deleting the
 * trade never touches the plan.
 */
export async function linkTradePlan(
  userId: string,
  id: string,
  positionId: string | null,
): Promise<TradePlan> {
  return withTransaction(db, async (tx) => {
    const [existing] = await tx
      .select()
      .from(tradePlans)
      .where(and(eq(tradePlans.userId, userId), eq(tradePlans.id, id)))
      .limit(1);
    if (!existing) throw new NotFoundError('TradePlan', id);

    if (positionId !== null) {
      const [position] = await tx
        .select({ id: positions.id })
        .from(positions)
        .where(and(eq(positions.userId, userId), eq(positions.id, positionId)))
        .limit(1);
      if (!position) throw new NotFoundError('Position', positionId);

      const [clash] = await tx
        .select({ id: tradePlans.id })
        .from(tradePlans)
        .where(and(eq(tradePlans.userId, userId), eq(tradePlans.positionId, positionId)))
        .limit(1);
      if (clash && clash.id !== id) {
        throw new ValidationError('That trade is already linked to another plan');
      }
    }

    const from = existing.status as TradePlanStatus;
    const status: TradePlanStatus =
      positionId === null
        ? from === 'executed'
          ? 'pending'
          : from
        : from === 'pending'
          ? 'executed'
          : from;

    const [row] = await tx
      .update(tradePlans)
      .set({ positionId, status, updatedAt: new Date() })
      .where(eq(tradePlans.id, id))
      .returning();
    return toTradePlan(row!);
  });
}
