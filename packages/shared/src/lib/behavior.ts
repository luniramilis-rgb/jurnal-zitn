import { toZonedTime } from 'date-fns-tz';

import { mean, sampleStdDev } from './risk';

// ---------------------------------------------------------------------------
// Fase F3 — behaviour analytics & daily risk control (ZITN-TECH-017 §10.7).
//
// Pure and total. Thresholds are EXPORTED constants with the rationale inline,
// because the plan requires them to be documented and arguable ("definisi ambang
// harus didokumentasikan agar dapat diperdebatkan").
//
// Definitions (all in the reporting timezone):
//   - Daily trade count: trades ENTERED on a calendar day (by entry time).
//   - Overtrading day:    a day whose entry count exceeds the mean + 1.5 sample
//                         standard deviations of the days that had at least one
//                         trade. Needs >= 2 active days for sigma to exist.
//   - Revenge trade:      a trade ENTERED within REVENGE_WINDOW_MINUTES of the
//                         CLOSE of a losing trade. (A short re-entry after a
//                         loss; the window is the arguable part.)
//   - Discipline score:   a 0..100 weighted average of three COMPLIANCE rates —
//                         tagged rate, non-revenge rate, non-overtrading-day
//                         rate — with the weights below. It measures process,
//                         never outcome.
// ---------------------------------------------------------------------------

/** A day is "overtrading" above mean + this many sample standard deviations. */
export const OVERTRADING_SIGMA_MULTIPLIER = 1.5;

/** A re-entry within this many minutes of a losing close counts as revenge. */
export const REVENGE_WINDOW_MINUTES = 30;

/** Discipline weights (sum = 1). Tagging is weighted highest: it is the rule the
 *  user is most directly in control of trade by trade. */
export const DISCIPLINE_WEIGHTS = {
  tagging: 0.4,
  noRevenge: 0.3,
  noOvertrading: 0.3,
} as const;

/** The risk-control meter turns yellow at this fraction of the limit. */
export const RISK_CONTROL_YELLOW_RATIO = 0.75;

export interface BehaviorTrade {
  /** Entry instant (see F2's entry-time definition). */
  entryAt: Date;
  /** Close/flat instant; null when never flat (excluded from behaviour). */
  closedAt: Date | null;
  /** Net P&L as a number; sign decides win/loss for behaviour purposes. */
  netPnl: number;
  /** Number of tags on the position (0 ⇒ untagged). */
  tagCount: number;
}

export interface DailyCount {
  /** Local `YYYY-MM-DD` in the reporting zone. */
  key: string;
  count: number;
  over: boolean;
}

export interface OvertradingResult {
  /** Number of days with at least one entered trade. */
  activeDays: number;
  mean: number | null;
  stdDev: number | null;
  threshold: number | null;
  /** Days that exceeded the threshold, in date order. */
  overDays: DailyCount[];
  /** Fraction of active days that were over days (0 when no active days). */
  overDayRate: number;
}

function localDateKey(at: Date, tz: string): string {
  const z = toZonedTime(at, tz);
  const m = z.getMonth() + 1;
  const d = z.getDate();
  return `${z.getFullYear()}-${m < 10 ? `0${m}` : m}-${d < 10 ? `0${d}` : d}`;
}

/**
 * Overtrading detection over trades ENTERED per calendar day. The threshold is
 * `mean + 1.5·sampleStdDev` across active days; a day is flagged only when it is
 * strictly greater. With fewer than two active days there is no dispersion to
 * compare against, so nothing is flagged and every field is null/0.
 */
export function detectOvertrading(trades: readonly BehaviorTrade[], tz: string): OvertradingResult {
  const counts = new Map<string, number>();
  for (const t of trades) {
    const key = localDateKey(t.entryAt, tz);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const days = [...counts.entries()]
    .map(([key, count]) => ({ key, count, over: false }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  if (days.length === 0) {
    return {
      activeDays: 0,
      mean: null,
      stdDev: null,
      threshold: null,
      overDays: [],
      overDayRate: 0,
    };
  }

  const values = days.map((d) => d.count);
  const dayMean = mean(values);
  const sd = sampleStdDev(values);
  if (dayMean === null || sd === null) {
    return {
      activeDays: days.length,
      mean: dayMean,
      stdDev: sd,
      threshold: null,
      overDays: [],
      overDayRate: 0,
    };
  }

  const threshold = dayMean + OVERTRADING_SIGMA_MULTIPLIER * sd;
  const overDays = days.filter((d) => d.count > threshold).map((d) => ({ ...d, over: true }));
  return {
    activeDays: days.length,
    mean: dayMean,
    stdDev: sd,
    threshold,
    overDays,
    overDayRate: overDays.length / days.length,
  };
}

export interface RevengeResult {
  windowMinutes: number;
  revengeCount: number;
  /** Fraction of closed trades that are revenge trades. */
  revengeRate: number;
}

/**
 * Revenge trades: entries made within {@link REVENGE_WINDOW_MINUTES} of a losing
 * trade's close. Chronological and order-based, so a trade counts once however
 * many prior losses fall in the window.
 */
export function detectRevengeTrades(
  trades: readonly BehaviorTrade[],
  windowMinutes = REVENGE_WINDOW_MINUTES,
): RevengeResult {
  const losers = trades
    .filter((t) => t.closedAt !== null && t.netPnl < 0)
    .map((t) => t.closedAt!.getTime())
    .sort((a, b) => a - b);
  const windowMs = windowMinutes * 60_000;

  let revengeCount = 0;
  let closedCount = 0;
  for (const t of trades) {
    if (t.closedAt === null) continue;
    closedCount += 1;
    const entry = t.entryAt.getTime();
    // A losing close in (entry - window, entry) ⇒ this entry chased a loss.
    const hit = losers.some((c) => c <= entry && entry - c <= windowMs);
    if (hit) revengeCount += 1;
  }

  return {
    windowMinutes,
    revengeCount,
    revengeRate: closedCount === 0 ? 0 : revengeCount / closedCount,
  };
}

export interface DisciplineBreakdown {
  /** Fraction of trades carrying at least one tag. */
  taggedRate: number;
  /** Fraction of closed trades that are NOT revenge trades. */
  noRevengeRate: number;
  /** Fraction of active days that are NOT overtrading days. */
  noOvertradingRate: number;
}

export interface DisciplineScore extends DisciplineBreakdown {
  /** 0..100 (1 dp), the weighted average below. Null with no trades. */
  score: number | null;
}

function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

/**
 * Discipline score — a PROCESS metric, never an outcome one. It is the weighted
 * average of three compliance rates ({@link DISCIPLINE_WEIGHTS}): tagging,
 * avoiding revenge entries, and avoiding overtrading days. Null when there are
 * no trades, because there is nothing to be disciplined about yet.
 */
export function disciplineScore(
  over: OvertradingResult,
  revenge: RevengeResult,
  trades: readonly BehaviorTrade[],
): DisciplineScore {
  if (trades.length === 0) {
    return {
      taggedRate: 0,
      noRevengeRate: 0,
      noOvertradingRate: 0,
      score: null,
    };
  }
  const tagged = trades.filter((t) => t.tagCount > 0).length;
  const taggedRate = tagged / trades.length;
  const noRevengeRate = 1 - revenge.revengeRate;
  const noOvertradingRate = 1 - over.overDayRate;

  const score =
    100 *
    (DISCIPLINE_WEIGHTS.tagging * taggedRate +
      DISCIPLINE_WEIGHTS.noRevenge * noRevengeRate +
      DISCIPLINE_WEIGHTS.noOvertrading * noOvertradingRate);

  return { taggedRate, noRevengeRate, noOvertradingRate, score: round1(score) };
}

// ---------------------------------------------------------------------------
// Risk-of-ruin & Kelly — pure calculators for the position-sizing surface.
// ---------------------------------------------------------------------------

/**
 * Kelly stake fraction for a win probability and a win/loss payoff ratio
 * (`b` = average win / average loss). `p - (1-p)/b`. Negative when the edge is
 * negative; callers should clamp at 0. Null for a non-positive payoff ratio.
 */
export function kellyFraction(winRatePct: number, payoffRatio: number): number | null {
  if (!Number.isFinite(payoffRatio) || payoffRatio <= 0) return null;
  if (!Number.isFinite(winRatePct) || winRatePct < 0 || winRatePct > 100) return null;
  const p = winRatePct / 100;
  return p - (1 - p) / payoffRatio;
}

/** Half-Kelly stake — the conventional conservative choice. */
export function halfKellyFraction(winRatePct: number, payoffRatio: number): number | null {
  const k = kellyFraction(winRatePct, payoffRatio);
  return k === null ? null : k / 2;
}

/**
 * Risk of ruin under the classic even-money gambler's-ruin model: a trader with
 * `ruinUnits` units of capital, betting one unit per trade, wins with
 * probability `p`. Returns a percent. `100` when `p <= 0.5` (no positive edge ⇒
 * eventual ruin is certain). This is an APPROXIMATION for asymmetric payoffs —
 * it ignores the win/loss ratio and is deliberately conservative.
 */
export function riskOfRuin(winRatePct: number, ruinUnits: number): number | null {
  if (!Number.isFinite(winRatePct) || winRatePct < 0 || winRatePct > 100) return null;
  if (!Number.isFinite(ruinUnits) || ruinUnits <= 0) return null;
  const p = winRatePct / 100;
  if (p <= 0.5) return 100;
  return round1(((1 - p) / p) ** ruinUnits * 100);
}

// ---------------------------------------------------------------------------
// Daily risk control meter.
// ---------------------------------------------------------------------------

export type RiskControlLevel = 'green' | 'yellow' | 'red' | 'not-set';

export interface RiskControlReading {
  /** Fraction of the limit used, clamped to [0, 1]; null when no usable limit. */
  ratio: number | null;
  level: RiskControlLevel;
  /** Remaining before the limit, as a positive magnitude (0 once reached). */
  remaining: number;
}

/**
 * Level for a used/limit pair: red at or over the limit, yellow at or above 75%
 * of it, green below. A non-positive or missing limit is `not-set` (no meter).
 * `used` is clamped at 0 so a winning day never reads as negative usage.
 */
export function riskControlLevel(
  used: number,
  limit: number | null | undefined,
): RiskControlReading {
  const usedClamped = Number.isFinite(used) ? Math.max(0, used) : 0;
  if (limit === null || limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return { ratio: null, level: 'not-set', remaining: 0 };
  }
  const ratio = Math.min(1, usedClamped / limit);
  const remaining = Math.max(0, limit - usedClamped);
  if (usedClamped >= limit) return { ratio, level: 'red', remaining };
  if (ratio >= RISK_CONTROL_YELLOW_RATIO) return { ratio, level: 'yellow', remaining };
  return { ratio, level: 'green', remaining };
}
