import Decimal from 'decimal.js';
import { z } from 'zod';

/**
 * FX primitives for Jurnal ZITN (ZITN-TECH-022 §5.1) — the shared vocabulary the
 * API and web both use.
 *
 * The model is deliberately narrow:
 *   - A ledger row keeps its RAW fact (`amount` + `currency`). The IDR value is
 *     NEVER frozen into the row; it is derived on READ.
 *   - A rate carries its SOURCE and its `asof`, so a converted figure can always
 *     be explained ("≈ Rp 19,x jt · JISDOR 2026-09-28").
 *   - When no rate is available the caller FAILS HARD — this module never invents
 *     a rate (§5.2).
 *
 * v1 scope: IDX (IDR) + US equities (USD) only (D-K3 = a).
 */

/** Where a rate comes from. */
export const FX_SOURCES = ['implicit', 'user', 'canonical'] as const;
export type FxSource = (typeof FX_SOURCES)[number];

/**
 * Priority when several rates exist for the same pair (§5.1.4):
 * `implicit` (a rate the transaction/broker already stated) beats the user's own
 * rate, which beats the canonical ZITN JISDOR rate.
 */
export const FX_SOURCE_PRIORITY: Record<FxSource, number> = {
  implicit: 0,
  user: 1,
  canonical: 2,
};

export const FxRateSchema = z.object({
  base: z.string().length(3),
  quote: z.string().length(3),
  /** Decimal string — money precision, never a JS number. */
  rate: z.string().regex(/^\d+(\.\d+)?$/),
  source: z.enum(FX_SOURCES),
  /** Effective date the rate is as-of, `YYYY-MM-DD`. */
  asof: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type FxRate = z.infer<typeof FxRateSchema>;

export function fxSourceRank(source: FxSource): number {
  return FX_SOURCE_PRIORITY[source];
}

/**
 * The single rate to use among candidates for ONE pair, or `null` when there is
 * none. Highest-priority source wins; a tie is settled by the latest `asof`.
 * Callers MUST treat `null` as a hard failure (MissingRate), never a default.
 */
export function pickFxRate(rates: readonly FxRate[]): FxRate | null {
  let best: FxRate | null = null;
  for (const candidate of rates) {
    if (!best) {
      best = candidate;
      continue;
    }
    const rank = fxSourceRank(candidate.source);
    const bestRank = fxSourceRank(best.source);
    if (rank < bestRank || (rank === bestRank && candidate.asof > best.asof)) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Revalue an `amount` stated in the rate's BASE currency into its QUOTE currency.
 * Pure and Decimal-exact; the caller decides rounding for display.
 */
export function revalue(amount: string | Decimal, rate: FxRate): Decimal {
  return new Decimal(amount).times(new Decimal(rate.rate));
}
