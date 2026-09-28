import { describe, expect, it } from 'vitest';

import {
  breakevenWinRate,
  calmarRatio,
  downsideDeviation,
  maxDrawdown,
  mean,
  periodsPerYearForGranularity,
  rMultipleBySymbol,
  rMultipleStats,
  rollingWinRate,
  sampleStdDev,
  sharpeRatio,
  sortinoRatio,
} from './risk';

// Golden values below are hand-computed; where a float is involved the expected
// literal is the same expression rounded to the function's documented precision.

describe('descriptive helpers', () => {
  it('mean is null for an empty population', () => {
    expect(mean([])).toBeNull();
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it('sampleStdDev needs two observations', () => {
    expect(sampleStdDev([])).toBeNull();
    expect(sampleStdDev([3])).toBeNull();
    // variance = 5/3, sd = 1.290994…
    expect(sampleStdDev([1, 2, 3, 4])).toBeCloseTo(Math.sqrt(5 / 3), 12);
  });

  it('downsideDeviation is over the whole population and zero when nothing is below target', () => {
    expect(downsideDeviation([1, 2, 3, 4])).toBe(0);
    // shortfalls [1,0,1,0] → mean sq 0.5 → sqrt = 0.7071…
    expect(downsideDeviation([-1, 2, -1, 4])).toBeCloseTo(Math.sqrt(0.5), 12);
  });

  it('periodsPerYearForGranularity follows the trading convention', () => {
    expect(periodsPerYearForGranularity('day')).toBe(252);
    expect(periodsPerYearForGranularity('week')).toBe(52);
    expect(periodsPerYearForGranularity('month')).toBe(12);
    expect(periodsPerYearForGranularity('year')).toBe(1);
  });
});

describe('sharpeRatio', () => {
  it('computes mean/sd annualised by sqrt(periodsPerYear)', () => {
    // 2.5 / sqrt(5/3) = 1.93649…
    expect(sharpeRatio([1, 2, 3, 4], 1)).toBe(1.94);
    // × sqrt(252) = 30.74…
    expect(sharpeRatio([1, 2, 3, 4], 252)).toBe(30.74);
  });

  it('is null without dispersion or without two periods', () => {
    expect(sharpeRatio([], 252)).toBeNull();
    expect(sharpeRatio([5], 252)).toBeNull();
    expect(sharpeRatio([5, 5, 5], 252)).toBeNull();
  });
});

describe('sortinoRatio', () => {
  it('divides mean by downside deviation', () => {
    // mean 1, dd = sqrt(0.5) = 0.7071… → 1.4142…
    expect(sortinoRatio([-1, 2, -1, 4], 1)).toBe(1.41);
  });

  it('is null when nothing is below the target', () => {
    expect(sortinoRatio([1, 2, 3, 4], 252)).toBeNull();
  });
});

describe('maxDrawdown', () => {
  it('reports magnitude, percent of peak and the longest underwater run', () => {
    // cum: 10, 5, -5, 0; peak 10; dd = 15; run below peak = 3.
    expect(maxDrawdown([10, -5, -10, 5])).toEqual({
      maxDrawdown: 15,
      maxDrawdownPct: 150,
      longestPeriods: 3,
    });
  });

  it('treats 0 as the initial peak, so a first-period loss counts', () => {
    // cum: -10, -5; peak 0; dd = 10; pct undefined (no positive peak).
    expect(maxDrawdown([-10, 5])).toEqual({
      maxDrawdown: 10,
      maxDrawdownPct: null,
      longestPeriods: 2,
    });
  });

  it('is all-zero for an empty stream', () => {
    expect(maxDrawdown([])).toEqual({ maxDrawdown: 0, maxDrawdownPct: null, longestPeriods: 0 });
  });
});

describe('calmarRatio', () => {
  it('is annualised mean P&L over the drawdown magnitude', () => {
    // mean 5, dd 15 → 0.333… at ppy 1.
    expect(calmarRatio([10, -5, -10, 25], 1)).toBe(0.33);
  });

  it('is null when there is no drawdown to divide by', () => {
    expect(calmarRatio([1, 2, 3], 252)).toBeNull();
    expect(calmarRatio([], 252)).toBeNull();
  });
});

describe('rollingWinRate', () => {
  it('reports a win rate per window ending at each index', () => {
    // wins are pnl > 0; breakeven (0) is not a win.
    const result = rollingWinRate([1, -1, 1, 1], 2);
    expect(result.window).toBe(2);
    expect(result.points).toEqual([
      { index: 1, value: 50 },
      { index: 2, value: 50 },
      { index: 3, value: 100 },
    ]);
    expect(result.latest).toBe(100);
  });

  it('has no points and no latest value below one full window', () => {
    expect(rollingWinRate([1, 1, 1], 20)).toEqual({ window: 20, latest: null, points: [] });
  });

  it('rejects a non-positive window', () => {
    expect(() => rollingWinRate([1], 0)).toThrow();
  });
});

describe('rMultipleStats (average loss = 1R)', () => {
  it('derives 1R from the average loss and bins each trade', () => {
    // losses mean 100 → R = [2, -1, -1, 4]; mean R = 1.
    const result = rMultipleStats([200, -100, -100, 400]);
    expect(result.riskUnit).toBe(100);
    expect(result.avgR).toBe(1);
    expect(result.expectancyR).toBe(1);
    expect(result.sampleSize).toBe(4);
    expect(result.histogram).toEqual([
      { min: null, max: -2, count: 0 },
      { min: -2, max: -1, count: 0 },
      { min: -1, max: 0, count: 2 },
      { min: 0, max: 1, count: 0 },
      { min: 1, max: 2, count: 0 },
      { min: 2, max: null, count: 2 },
    ]);
  });

  it('is undefined without a losing trade', () => {
    const result = rMultipleStats([1, 2, 3]);
    expect(result.riskUnit).toBeNull();
    expect(result.avgR).toBeNull();
    expect(result.expectancyR).toBeNull();
    expect(result.histogram).toEqual([]);
    expect(result.sampleSize).toBe(3);
  });
});

describe('rMultipleBySymbol', () => {
  it('measures each symbol against its own average loss, sorted by key', () => {
    const result = rMultipleBySymbol([
      { key: 'A', pnl: 200 },
      { key: 'A', pnl: -100 },
      { key: 'B', pnl: -50 },
      { key: 'B', pnl: 100 },
    ]);
    expect(result).toEqual([
      { key: 'A', trades: 2, avgR: 0.5, expectancyR: 0.5 },
      { key: 'B', trades: 2, avgR: 0.5, expectancyR: 0.5 },
    ]);
  });
});

describe('breakevenWinRate', () => {
  it('is 100/(1+rewardRisk) as a percent', () => {
    expect(breakevenWinRate(2)).toBe(33.3);
    expect(breakevenWinRate(1)).toBe(50);
    expect(breakevenWinRate(3)).toBe(25);
  });

  it('is null for a non-positive or non-finite ratio', () => {
    expect(breakevenWinRate(0)).toBeNull();
    expect(breakevenWinRate(-1)).toBeNull();
    expect(breakevenWinRate(Number.POSITIVE_INFINITY)).toBeNull();
    expect(breakevenWinRate(Number.NaN)).toBeNull();
  });
});
