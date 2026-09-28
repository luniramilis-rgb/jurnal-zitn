// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { liveRR } from './TradePlansPage';

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
