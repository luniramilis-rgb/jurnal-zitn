import { describe, expect, it } from 'vitest';

import {
  detectOvertrading,
  detectRevengeTrades,
  disciplineScore,
  DISCIPLINE_WEIGHTS,
  halfKellyFraction,
  kellyFraction,
  REVENGE_WINDOW_MINUTES,
  riskControlLevel,
  riskOfRuin,
  type BehaviorTrade,
  type OvertradingResult,
  type RevengeResult,
} from './behavior';

function trade(over: Partial<BehaviorTrade> & { entryAt: Date }): BehaviorTrade {
  return {
    entryAt: over.entryAt,
    closedAt: over.closedAt === undefined ? over.entryAt : over.closedAt,
    netPnl: over.netPnl ?? 0,
    tagCount: over.tagCount ?? 0,
  };
}

describe('detectOvertrading', () => {
  it('flags days above mean + 1.5·sample-stddev', () => {
    // Five active days with counts [1,1,1,1,20]: mean 4.8, sample sd 8.4969…,
    // threshold 17.545…, so only the 20-trade day is over.
    const trades: BehaviorTrade[] = [];
    const perDay = [1, 1, 1, 1, 20];
    perDay.forEach((count, day) => {
      for (let i = 0; i < count; i++) {
        trades.push(trade({ entryAt: new Date(Date.UTC(2026, 2, day + 1, 12, 0, 0)) }));
      }
    });
    const result = detectOvertrading(trades, 'UTC');
    expect(result.mean).toBeCloseTo(4.8, 6);
    expect(result.stdDev).toBeCloseTo(8.4969, 3);
    expect(result.threshold).toBeCloseTo(17.545, 2);
    expect(result.overDays).toHaveLength(1);
    expect(result.overDays[0]!.count).toBe(20);
    expect(result.overDays[0]!.key).toBe('2026-03-05');
    expect(result.activeDays).toBe(5);
    expect(result.overDayRate).toBeCloseTo(0.2, 10);
  });

  it('flags nothing (null threshold) with fewer than two active days', () => {
    const result = detectOvertrading([trade({ entryAt: new Date('2026-03-01T00:00:00Z') })], 'UTC');
    expect(result.threshold).toBeNull();
    expect(result.overDays).toEqual([]);
    expect(result.activeDays).toBe(1);
  });

  it('is all-null and empty for no trades', () => {
    expect(detectOvertrading([], 'UTC')).toEqual({
      activeDays: 0,
      mean: null,
      stdDev: null,
      threshold: null,
      overDays: [],
      overDayRate: 0,
    });
  });

  it('buckets entry days in the reporting zone', () => {
    // 2026-03-05T18:00Z is 2026-03-06 01:00 in Asia/Jakarta.
    const result = detectOvertrading(
      [trade({ entryAt: new Date('2026-03-05T18:00:00Z') })],
      'Asia/Jakarta',
    );
    expect(result.mean).toBe(1);
  });
});

describe('detectRevengeTrades', () => {
  it('counts entries within the window after a losing close', () => {
    const t0 = new Date('2026-03-05T14:00:00.000Z');
    const loser = trade({
      entryAt: new Date(t0.getTime() - 3_600_000),
      closedAt: t0,
      netPnl: -100,
    });
    const revenge = trade({
      entryAt: new Date(t0.getTime() + 10 * 60_000),
      closedAt: new Date(t0.getTime() + 20 * 60_000),
      netPnl: 50,
    });
    const later = trade({
      entryAt: new Date(t0.getTime() + 40 * 60_000),
      closedAt: new Date(t0.getTime() + 50 * 60_000),
      netPnl: 20,
    });
    const result = detectRevengeTrades([loser, revenge, later]);
    expect(result.windowMinutes).toBe(REVENGE_WINDOW_MINUTES);
    expect(result.revengeCount).toBe(1);
    expect(result.revengeRate).toBeCloseTo(1 / 3, 10);
  });

  it('does not count a re-entry after a WIN', () => {
    const t0 = new Date('2026-03-05T14:00:00.000Z');
    const winner = trade({
      entryAt: new Date(t0.getTime() - 3_600_000),
      closedAt: t0,
      netPnl: 100,
    });
    const next = trade({ entryAt: new Date(t0.getTime() + 5 * 60_000), netPnl: 10 });
    expect(detectRevengeTrades([winner, next]).revengeCount).toBe(0);
  });
});

describe('disciplineScore', () => {
  const over: OvertradingResult = {
    activeDays: 1,
    mean: 1,
    stdDev: 0,
    threshold: null,
    overDays: [],
    overDayRate: 0,
  };
  const revenge: RevengeResult = { windowMinutes: 30, revengeCount: 1, revengeRate: 0.25 };

  it('is the weighted average of tagging, no-revenge and no-overtrading rates', () => {
    const trades = [
      trade({ entryAt: new Date('2026-03-01T10:00:00Z'), tagCount: 1 }),
      trade({ entryAt: new Date('2026-03-02T10:00:00Z'), tagCount: 0 }),
      trade({ entryAt: new Date('2026-03-03T10:00:00Z'), tagCount: 1 }),
      trade({ entryAt: new Date('2026-03-04T10:00:00Z'), tagCount: 0 }),
    ];
    const result = disciplineScore(over, revenge, trades);
    expect(result.taggedRate).toBe(0.5);
    expect(result.noRevengeRate).toBe(0.75);
    expect(result.noOvertradingRate).toBe(1);
    // 100 × (0.4×0.5 + 0.3×0.75 + 0.3×1) = 72.5
    expect(result.score).toBe(72.5);
    expect(
      DISCIPLINE_WEIGHTS.tagging + DISCIPLINE_WEIGHTS.noRevenge + DISCIPLINE_WEIGHTS.noOvertrading,
    ).toBeCloseTo(1, 10);
  });

  it('is null with no trades', () => {
    expect(disciplineScore(over, revenge, []).score).toBeNull();
  });
});

describe('kellyFraction / halfKellyFraction', () => {
  it('is p − (1−p)/b', () => {
    expect(kellyFraction(60, 2)).toBeCloseTo(0.4, 10);
    expect(kellyFraction(40, 1)).toBeCloseTo(-0.2, 10);
    expect(halfKellyFraction(60, 2)).toBeCloseTo(0.2, 10);
  });

  it('is null for a bad payoff ratio or out-of-range win rate', () => {
    expect(kellyFraction(60, 0)).toBeNull();
    expect(kellyFraction(60, -1)).toBeNull();
    expect(kellyFraction(120, 2)).toBeNull();
  });
});

describe('riskOfRuin', () => {
  it('is the even-money gambler’s-ruin probability ((1−p)/p)^N', () => {
    // ((1-0.6)/0.6)^10 = 0.6667^10 = 0.01734… → 1.7%
    expect(riskOfRuin(60, 10)).toBe(1.7);
  });

  it('is 100% at or below a coin flip (no positive edge)', () => {
    expect(riskOfRuin(50, 10)).toBe(100);
    expect(riskOfRuin(40, 10)).toBe(100);
  });

  it('is null for a non-positive unit count', () => {
    expect(riskOfRuin(60, 0)).toBeNull();
    expect(riskOfRuin(60, -1)).toBeNull();
  });
});

describe('riskControlLevel', () => {
  it('is green below 75%, yellow at/above, red at the limit', () => {
    expect(riskControlLevel(50, 100).level).toBe('green');
    expect(riskControlLevel(74.99, 100).level).toBe('green');
    expect(riskControlLevel(75, 100).level).toBe('yellow');
    expect(riskControlLevel(99, 100).level).toBe('yellow');
    expect(riskControlLevel(100, 100).level).toBe('red');
    expect(riskControlLevel(120, 100).level).toBe('red');
  });

  it('reports remaining and clamps ratio to [0, 1]', () => {
    expect(riskControlLevel(30, 100).remaining).toBe(70);
    expect(riskControlLevel(120, 100).remaining).toBe(0);
    expect(riskControlLevel(120, 100).ratio).toBe(1);
    expect(riskControlLevel(-5, 100).ratio).toBe(0);
  });

  it('is not-set for a missing or non-positive limit', () => {
    expect(riskControlLevel(10, null).level).toBe('not-set');
    expect(riskControlLevel(10, 0).level).toBe('not-set');
    expect(riskControlLevel(10, undefined).level).toBe('not-set');
  });
});
