import Decimal from 'decimal.js';

import { attributionParts, hourLabel, WEEKDAY_LABELS, type BreakdownPosition } from './breakdown';

// ---------------------------------------------------------------------------
// Fase F2 — entry-time distribution (ZITN-TECH-017 §10.6).
//
// P&L, trade count and win rate grouped by the WEEKDAY and the HOUR at which
// the position was ENTERED (earliest entry fill), expressed in the reporting
// timezone. This is deliberately different from the `weekday`/`hour` breakdown
// dimensions, which key on the flat/close instant — F2 answers "when do I
// trade", not "when do I exit".
//
// Pure: takes positions and returns plain values; no I/O.
// ---------------------------------------------------------------------------

export interface TimeBucketStats {
  key: string;
  label: string;
  netPnl: string;
  trades: number;
  /** Decided-trade win rate as a percent (1 dp), or null with no decided trades. */
  winRate: number | null;
}

export interface TimeDistribution {
  /** Seven buckets in `weekStartDay` order, keyed by `getDay()` (`'0'` = Sunday). */
  weekday: TimeBucketStats[];
  /** Twenty-four buckets `'0'`…`'23'` in order. */
  hour: TimeBucketStats[];
}

interface Accumulator {
  key: string;
  label: string;
  netPnl: Decimal;
  trades: number;
  wins: number;
  losses: number;
}

function percentile(wins: number, losses: number): number | null {
  const decided = wins + losses;
  if (decided === 0) return null;
  return Number(
    new Decimal(wins).div(decided).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP),
  );
}

function finalize(acc: Accumulator): TimeBucketStats {
  return {
    key: acc.key,
    label: acc.label,
    netPnl: acc.netPnl.toString(),
    trades: acc.trades,
    winRate: percentile(acc.wins, acc.losses),
  };
}

export function computeTimeDistribution(
  positions: readonly BreakdownPosition[],
  tz: string,
  weekStartDay: 0 | 1,
): TimeDistribution {
  const weekday: Accumulator[] = [];
  const byWeekday = new Map<number, Accumulator>();
  for (let i = 0; i < 7; i++) {
    const weekdayNumber = (weekStartDay + i) % 7;
    const acc: Accumulator = {
      key: String(weekdayNumber),
      label: WEEKDAY_LABELS[weekdayNumber],
      netPnl: new Decimal(0),
      trades: 0,
      wins: 0,
      losses: 0,
    };
    weekday.push(acc);
    byWeekday.set(weekdayNumber, acc);
  }

  const hour: Accumulator[] = [];
  for (let h = 0; h < 24; h++) {
    hour.push({
      key: String(h),
      label: hourLabel(h),
      netPnl: new Decimal(0),
      trades: 0,
      wins: 0,
      losses: 0,
    });
  }

  for (const p of positions) {
    const { weekday: weekdayNumber, hour: hourNumber } = attributionParts(p.entryAt, tz);
    for (const acc of [byWeekday.get(weekdayNumber)!, hour[hourNumber]!]) {
      acc.trades += 1;
      acc.netPnl = acc.netPnl.plus(p.netPnl);
      if (p.classification === 'winning') acc.wins += 1;
      else if (p.classification === 'losing') acc.losses += 1;
    }
  }

  return { weekday: weekday.map(finalize), hour: hour.map(finalize) };
}
