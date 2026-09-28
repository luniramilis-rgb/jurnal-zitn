import Decimal from 'decimal.js';

import type { Granularity } from '../schemas/performance';

// ---------------------------------------------------------------------------
// Fase F1 — pure risk & R-multiple analytics (ZITN-TECH-017 §10.5).
//
// Every function here is total and side-effect free: it takes plain numbers and
// returns plain numbers (or null where a value is undefined). No I/O, no Decimal
// strings on the wire — the API layer formats/rounds against the response schema.
//
// Modelling note (recorded so the numbers can be argued with): the performance
// response carries per-BUCKET P&L and a cumulative P&L curve, not account equity
// and not per-trade returns. So:
//   - Sharpe/Sortino are computed on the per-period P&L stream (mean over
//     standard deviation is dimensionless, so no capital base is needed) and
//     annualised by sqrt(periodsPerYear).
//   - Calmar is the annualised mean P&L over the maximum drawdown magnitude
//     (a P&L-based Calmar; there is no capital base to divide by).
//   - R-multiple uses "average loss = 1R" exactly as §10.5 specifies, so it is
//     derived from the closed-trade P&L list alone.
// ---------------------------------------------------------------------------

/** Trading periods per year for each bucket granularity (crypto/stock convention). */
export const PERIODS_PER_YEAR: Record<Granularity, number> = {
  day: 252,
  week: 52,
  month: 12,
  year: 1,
};

export function periodsPerYearForGranularity(granularity: Granularity): number {
  return PERIODS_PER_YEAR[granularity];
}

function round(value: number, dp: number): number {
  return Number(new Decimal(value).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP));
}

/** Arithmetic mean, or null for an empty population. */
export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Sample standard deviation (n-1); null below two observations. */
export function sampleStdDev(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  let sumSq = 0;
  for (const v of values) sumSq += (v - m) ** 2;
  return Math.sqrt(sumSq / (values.length - 1));
}

/**
 * Downside deviation about `threshold`: the root-mean-square of the below-target
 * deviations, taken over the WHOLE population (the standard Sortino form), so a
 * period with no shortfall contributes 0 rather than being dropped.
 */
export function downsideDeviation(values: readonly number[], threshold = 0): number | null {
  if (values.length === 0) return null;
  let sumSq = 0;
  for (const v of values) {
    const shortfall = Math.min(0, v - threshold);
    sumSq += shortfall ** 2;
  }
  return Math.sqrt(sumSq / values.length);
}

/**
 * Sharpe ratio over a per-period P&L stream, annualised by sqrt(periodsPerYear).
 * Null when there is no dispersion (fewer than two periods, or zero variance) —
 * an undefined ratio, not a zero one.
 */
export function sharpeRatio(periodPnls: readonly number[], periodsPerYear: number): number | null {
  const m = mean(periodPnls);
  const sd = sampleStdDev(periodPnls);
  if (m === null || sd === null || sd === 0) return null;
  return round((m / sd) * Math.sqrt(periodsPerYear), 2);
}

/** Sortino ratio over a per-period P&L stream. Null when downside deviation is 0. */
export function sortinoRatio(periodPnls: readonly number[], periodsPerYear: number): number | null {
  const m = mean(periodPnls);
  const dd = downsideDeviation(periodPnls);
  if (m === null || dd === null || dd === 0) return null;
  return round((m / dd) * Math.sqrt(periodsPerYear), 2);
}

export interface DrawdownResult {
  /** Largest peak-to-trough decline of the cumulative P&L, as a positive magnitude. */
  maxDrawdown: number;
  /** `maxDrawdown` as a percent of the peak cumulative P&L, or null when no peak > 0. */
  maxDrawdownPct: number | null;
  /** Longest run of consecutive periods spent below a prior peak (0 when never). */
  longestPeriods: number;
}

/**
 * Drawdown of the cumulative P&L curve built from a per-period P&L stream. The
 * curve starts at 0, and 0 is an initial peak, so a loss in the very first period
 * is a drawdown rather than invisible.
 */
export function maxDrawdown(periodPnls: readonly number[]): DrawdownResult {
  let cumulative = 0;
  let peak = 0;
  let maxDd = 0;
  let run = 0;
  let longestRun = 0;

  for (const pnl of periodPnls) {
    cumulative += pnl;
    if (cumulative > peak) {
      peak = cumulative;
      run = 0;
    } else if (cumulative < peak) {
      run += 1;
      if (run > longestRun) longestRun = run;
      const dd = peak - cumulative;
      if (dd > maxDd) maxDd = dd;
    }
  }

  return {
    maxDrawdown: round(maxDd, 2),
    maxDrawdownPct: peak > 0 ? round((maxDd / peak) * 100, 1) : null,
    longestPeriods: longestRun,
  };
}

/**
 * Calmar ratio: annualised mean P&L over the maximum drawdown magnitude. Null
 * when there is no drawdown to divide by (no losing stretch) or no data.
 */
export function calmarRatio(periodPnls: readonly number[], periodsPerYear: number): number | null {
  const m = mean(periodPnls);
  if (m === null) return null;
  const { maxDrawdown: dd } = maxDrawdown(periodPnls);
  if (dd === 0) return null;
  return round((m * periodsPerYear) / dd, 2);
}

export interface WinRatePoint {
  index: number;
  value: number;
}

export interface RollingWinRateResult {
  window: number;
  latest: number | null;
  points: WinRatePoint[];
}

/**
 * Rolling win rate over closed-trade P&L. A win is `pnl > 0`; a breakeven
 * (`pnl === 0`) is not a win, matching the positions list. `points[i]` is the
 * window ending at trade `i + window - 1`.
 */
export function rollingWinRate(tradePnls: readonly number[], window = 20): RollingWinRateResult {
  if (window < 1) throw new Error('rollingWinRate: window must be >= 1');
  const points: WinRatePoint[] = [];
  for (let end = window - 1; end < tradePnls.length; end++) {
    let wins = 0;
    for (let i = end - window + 1; i <= end; i++) {
      if (tradePnls[i]! > 0) wins += 1;
    }
    points.push({ index: end, value: round((wins / window) * 100, 1) });
  }
  const latest = points.length === 0 ? null : points[points.length - 1]!.value;
  return { window, latest, points };
}

export interface RHistogramBin {
  /** Inclusive lower edge in R; null = unbounded below. */
  min: number | null;
  /** Exclusive upper edge in R; null = unbounded above. */
  max: number | null;
  count: number;
}

export interface RMultipleResult {
  /** |mean loss| — the 1R unit. Null when there are no losing trades. */
  riskUnit: number | null;
  /** Mean R over every trade. Null when `riskUnit` is null. */
  avgR: number | null;
  /** Mean R — identical to `avgR` under "average loss = 1R"; kept for §10.5 wording. */
  expectancyR: number | null;
  histogram: RHistogramBin[];
  sampleSize: number;
}

const R_BIN_EDGES = [-2, -1, 0, 1, 2] as const;

/**
 * R-multiple statistics over closed-trade P&L, with "average loss = 1R" (§10.5).
 * R is undefined without at least one loss, so an all-winning set returns a null
 * risk unit and no histogram rather than dividing by zero.
 */
export function rMultipleStats(tradePnls: readonly number[]): RMultipleResult {
  const losses = tradePnls.filter((p) => p < 0);
  const riskUnit = losses.length === 0 ? null : Math.abs(mean(losses)!);

  const histogram: RHistogramBin[] = [];
  if (riskUnit !== null && riskUnit > 0) {
    const edges: (number | null)[] = [null, ...R_BIN_EDGES, null];
    for (let i = 0; i < edges.length - 1; i++) {
      histogram.push({ min: edges[i]!, max: edges[i + 1]!, count: 0 });
    }
    for (const pnl of tradePnls) {
      const r = pnl / riskUnit;
      for (const bin of histogram) {
        const aboveMin = bin.min === null || r >= bin.min;
        const belowMax = bin.max === null || r < bin.max;
        if (aboveMin && belowMax) {
          bin.count += 1;
          break;
        }
      }
    }
  }

  let avgR: number | null = null;
  if (riskUnit !== null && riskUnit > 0) {
    avgR = round(mean(tradePnls.map((p) => p / riskUnit))!, 2);
  }

  return {
    riskUnit: riskUnit === null ? null : round(riskUnit, 2),
    avgR,
    expectancyR: avgR,
    histogram,
    sampleSize: tradePnls.length,
  };
}

export interface SymbolTrade {
  key: string;
  pnl: number;
}

export interface SymbolRStats {
  key: string;
  trades: number;
  avgR: number | null;
  expectancyR: number | null;
}

/**
 * Per-symbol R statistics, each symbol measured against its OWN average loss
 * (so a symbol with a different risk profile is not judged by another's R unit).
 * Sorted by key for deterministic output.
 */
export function rMultipleBySymbol(trades: readonly SymbolTrade[]): SymbolRStats[] {
  const groups = new Map<string, number[]>();
  for (const t of trades) {
    const bucket = groups.get(t.key);
    if (bucket) bucket.push(t.pnl);
    else groups.set(t.key, [t.pnl]);
  }
  return [...groups.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const pnls = groups.get(key)!;
      const stats = rMultipleStats(pnls);
      return {
        key,
        trades: pnls.length,
        avgR: stats.avgR,
        expectancyR: stats.expectancyR,
      };
    });
}

/**
 * Breakeven win rate for a reward:risk ratio, as a percent: `100 / (1 + rr)`.
 * Null for a non-positive or non-finite ratio (no reward to break even against).
 * Used by the position-sizing calculator (F1).
 */
export function breakevenWinRate(rewardRisk: number): number | null {
  if (!Number.isFinite(rewardRisk) || rewardRisk <= 0) return null;
  return round(100 / (1 + rewardRisk), 1);
}
