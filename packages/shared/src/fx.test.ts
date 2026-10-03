import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import {
  FX_SOURCE_PRIORITY,
  FxRateSchema,
  fxSourceRank,
  pickFxRate,
  revalue,
  type FxRate,
} from './fx';

const rate = (over: Partial<FxRate>): FxRate => ({
  base: 'USD',
  quote: 'IDR',
  rate: '15000',
  source: 'canonical',
  asof: '2026-09-28',
  ...over,
});

describe('fx — priority (ZITN-TECH-022 §5.1.4)', () => {
  it('orders implicit < user < canonical by rank', () => {
    expect(fxSourceRank('implicit')).toBeLessThan(fxSourceRank('user'));
    expect(fxSourceRank('user')).toBeLessThan(fxSourceRank('canonical'));
    expect(FX_SOURCE_PRIORITY.implicit).toBe(0);
  });

  it('prefers implicit over user over canonical', () => {
    const chosen = pickFxRate([
      rate({ source: 'canonical', asof: '2026-09-29' }),
      rate({ source: 'user', asof: '2026-09-01' }),
      rate({ source: 'implicit', asof: '2026-09-10' }),
    ]);
    expect(chosen?.source).toBe('implicit');
  });

  it('breaks a same-source tie with the latest asof', () => {
    const chosen = pickFxRate([
      rate({ source: 'canonical', asof: '2026-09-20' }),
      rate({ source: 'canonical', asof: '2026-09-28' }),
    ]);
    expect(chosen?.asof).toBe('2026-09-28');
  });

  it('returns null when there is no rate (caller fails hard)', () => {
    expect(pickFxRate([])).toBeNull();
  });
});

describe('fx — revalue', () => {
  it('multiplies with Decimal precision', () => {
    expect(revalue('100.10', rate({ rate: '15000.5' })).toString()).toBe(
      new Decimal('100.10').times(new Decimal('15000.5')).toString(),
    );
  });
});

describe('fx — schema', () => {
  it('accepts a well-formed rate', () => {
    expect(FxRateSchema.safeParse(rate({})).success).toBe(true);
  });

  it('rejects a non-decimal rate string', () => {
    expect(FxRateSchema.safeParse(rate({ rate: 'abc' })).success).toBe(false);
  });

  it('rejects an unknown source', () => {
    expect(FxRateSchema.safeParse({ ...rate({}), source: 'guess' }).success).toBe(false);
  });
});
