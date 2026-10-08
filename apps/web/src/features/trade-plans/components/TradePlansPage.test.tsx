// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { liveRR, linkablePositions, planLevelsPatch } from './TradePlansPage';

describe('linkablePositions (F4 link honesty)', () => {
  const positions = [
    { id: 'p1', symbol: 'CEG' },
    { id: 'p2', symbol: 'AAPL' },
    { id: 'p3', symbol: 'CEG' },
  ];

  it('offers only positions of the plan’s own symbol', () => {
    expect(linkablePositions({ symbol: 'CEG' }, positions, []).map((p) => p.id)).toEqual([
      'p1',
      'p3',
    ]);
  });

  it('excludes positions another plan already owns', () => {
    expect(
      linkablePositions({ symbol: 'CEG' }, positions, [
        { positionId: 'p1' },
        { positionId: null },
      ]).map((p) => p.id),
    ).toEqual(['p3']);
  });
});

describe('planLevelsPatch (F4 carry-over)', () => {
  it('copies stop/target only where the position has none', () => {
    expect(
      planLevelsPatch(
        { stopLoss: '3800', targetPrice: '4500' },
        { stopLoss: null, targetPrice: null },
      ),
    ).toEqual({ stopLoss: '3800', targetPrice: '4500' });
  });

  it('never overwrites values already on the position', () => {
    expect(
      planLevelsPatch(
        { stopLoss: '3800', targetPrice: '4500' },
        { stopLoss: 3000, targetPrice: 5000 },
      ),
    ).toEqual({});
  });

  it('is empty when the position is unknown or the plan omits levels', () => {
    expect(planLevelsPatch({ stopLoss: '3800', targetPrice: null }, undefined)).toEqual({});
    expect(
      planLevelsPatch({ stopLoss: null, targetPrice: null }, { stopLoss: null, targetPrice: null }),
    ).toEqual({});
  });
});

describe('liveRR (F4)', () => {
  it('computes reward:risk for a long from the entry zone high', () => {
    // entry 4000, stop 3800 (risk 200), target 4500 (reward 500) → 2.5
    expect(
      liveRR({
        side: 'long',
        entryZoneLow: '3900',
        entryZoneHigh: '4000',
        stopLoss: '3800',
        targetPrice: '4500',
      }),
    ).toBe(2.5);
  });

  it('computes reward:risk for a short', () => {
    // entry 4000, stop 4200 (risk 200), target 3600 (reward 400) → 2
    expect(
      liveRR({
        side: 'short',
        entryZoneLow: null,
        entryZoneHigh: '4000',
        stopLoss: '4200',
        targetPrice: '3600',
      }),
    ).toBe(2);
  });

  it('is null when a level is missing or the geometry is impossible', () => {
    expect(
      liveRR({
        side: 'long',
        entryZoneLow: null,
        entryZoneHigh: '4000',
        stopLoss: null,
        targetPrice: '4500',
      }),
    ).toBeNull();
    // Stop above entry on a long → risk <= 0.
    expect(
      liveRR({
        side: 'long',
        entryZoneLow: null,
        entryZoneHigh: '4000',
        stopLoss: '4100',
        targetPrice: '4500',
      }),
    ).toBeNull();
  });
});
