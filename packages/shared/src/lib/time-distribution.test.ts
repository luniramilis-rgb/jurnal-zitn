import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import type { BreakdownPosition } from './breakdown';
import { computeTimeDistribution } from './time-distribution';

function pos(over: Partial<BreakdownPosition> & { entryAt: Date }): BreakdownPosition {
  const netPnl = over.netPnl ?? new Decimal(0);
  return {
    id: over.id ?? 'p',
    currency: over.currency ?? 'USD',
    netPnl,
    grossPnl: over.grossPnl ?? netPnl,
    fees: over.fees ?? new Decimal(0),
    closedAt: over.closedAt ?? over.entryAt,
    classification: over.classification ?? 'breakeven',
    symbol: over.symbol ?? 'AAPL',
    assetType: over.assetType ?? 'stock',
    tags: over.tags ?? [],
    entryAt: over.entryAt,
  };
}

// Three trades entered at known instants; net P&L +100, -40, 0.
const P1 = pos({
  id: 'p1',
  entryAt: new Date('2026-03-04T19:30:00.000Z'), // Wed 19:30 UTC
  netPnl: new Decimal(100),
  classification: 'winning',
});
const P2 = pos({
  id: 'p2',
  entryAt: new Date('2026-03-04T19:45:00.000Z'), // Wed 19:45 UTC
  netPnl: new Decimal(-40),
  classification: 'losing',
});
const P3 = pos({
  id: 'p3',
  entryAt: new Date('2026-03-05T02:00:00.000Z'), // Thu 02:00 UTC
  netPnl: new Decimal(0),
  classification: 'breakeven',
});

function byKey(rows: { key: string }[], key: string) {
  return rows.find((r) => r.key === key)!;
}

describe('computeTimeDistribution', () => {
  it('groups trades by the entry weekday and hour in the reporting zone', () => {
    const dist = computeTimeDistribution([P1, P2, P3], 'UTC', 0);

    expect(dist.weekday).toHaveLength(7);
    expect(dist.hour).toHaveLength(24);

    expect(byKey(dist.weekday, '3')).toMatchObject({
      label: 'Wednesday',
      netPnl: '60',
      trades: 2,
      winRate: 50,
    });
    expect(byKey(dist.weekday, '4')).toMatchObject({
      label: 'Thursday',
      netPnl: '0',
      trades: 1,
      winRate: null,
    });
    expect(byKey(dist.weekday, '0')).toMatchObject({ trades: 0, netPnl: '0', winRate: null });

    expect(byKey(dist.hour, '19')).toMatchObject({
      label: '19:00',
      netPnl: '60',
      trades: 2,
      winRate: 50,
    });
    expect(byKey(dist.hour, '2')).toMatchObject({
      label: '02:00',
      netPnl: '0',
      trades: 1,
      winRate: null,
    });
  });

  it('re-expresses the same entries in another zone (WIB shifts hour and weekday)', () => {
    // 19:30Z / 19:45Z → Thursday 02:30 / 02:45 in Asia/Jakarta (UTC+7);
    // 02:00Z → Thursday 09:00.
    const dist = computeTimeDistribution([P1, P2, P3], 'Asia/Jakarta', 0);

    expect(byKey(dist.weekday, '4')).toMatchObject({ netPnl: '60', trades: 3, winRate: 50 });
    expect(byKey(dist.weekday, '3')).toMatchObject({ trades: 0 });
    expect(byKey(dist.hour, '2')).toMatchObject({ netPnl: '60', trades: 2, winRate: 50 });
    expect(byKey(dist.hour, '9')).toMatchObject({ netPnl: '0', trades: 1, winRate: null });
    expect(byKey(dist.hour, '19')).toMatchObject({ trades: 0 });
  });

  it('orders weekday buckets from the configured week start', () => {
    const monday = computeTimeDistribution([], 'UTC', 1).weekday.map((r) => r.key);
    expect(monday).toEqual(['1', '2', '3', '4', '5', '6', '0']);
    const sunday = computeTimeDistribution([], 'UTC', 0).weekday.map((r) => r.key);
    expect(sunday).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });

  it('returns all-empty buckets for no positions', () => {
    const dist = computeTimeDistribution([], 'UTC', 0);
    expect(
      dist.weekday.every((r) => r.trades === 0 && r.netPnl === '0' && r.winRate === null),
    ).toBe(true);
    expect(dist.hour).toHaveLength(24);
    expect(dist.hour.every((r) => r.trades === 0)).toBe(true);
  });
});
