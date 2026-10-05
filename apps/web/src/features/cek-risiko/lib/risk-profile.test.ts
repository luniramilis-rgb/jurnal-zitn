import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RISK_MARKET,
  isRiskMarket,
  lookupRiskProfile,
  portfolioComponents,
  riskCellKey,
  snapChoice,
  type RiskProfileCell,
  type RiskProfileChoice,
  type RiskProfileFile,
} from './risk-profile';

// A tiny FIXTURE. The real grid is strategy IP, fetched at runtime — never here.
const cell: RiskProfileCell = {
  n: 10,
  r_r: 1,
  breakeven: 0.5,
  p_tp: 0.6,
  p_sl: 0.4,
  e_net: 0.1,
  median: 0.05,
  p5: -0.05,
  p1: -0.05,
  min: -0.05,
  p_loss10: 0,
  p_loss20: 0,
  p_loss40: 0,
};

const profile: RiskProfileFile = {
  generated: '2026-01-01T00:00:00Z',
  cost: 0.002,
  cooldown: 40,
  label_basis: 'in-sample',
  rules: { R1: { label: 'One', grid: { 'penuh|tp10_sl10_h60': cell } } },
};

describe('risk-profile — pure lookup over the runtime grid (ZITN-TECH-043)', () => {
  it('resolves an existing cell exactly', () => {
    const { cell: got, approx } = lookupRiskProfile(profile, {
      market: 'us',
      rule: 'R1',
      period: 'penuh',
      tp: 10,
      sl: 10,
      h: 60,
    });
    expect(approx).toBe(false);
    expect(got).not.toBeNull();
  });

  it('is null-safe when the grid is not loaded', () => {
    expect(
      lookupRiskProfile(null, { market: 'us', rule: 'R1', period: 'penuh', tp: 10, sl: 10, h: 60 })
        .cell,
    ).toBeNull();
  });

  it('rounds off-grid choices to the nearest cell and flags "approx"', () => {
    const choice: RiskProfileChoice = {
      market: 'us',
      rule: 'R1',
      period: 'penuh',
      tp: 12,
      sl: 11,
      h: 100,
    };
    const { approx, used } = lookupRiskProfile(profile, choice);
    expect(approx).toBe(true);
    expect(used.tp).toBe(10);
    expect(used.sl).toBe(10);
    expect(used.h).toBe(60);
  });

  it('keeps an on-grid choice approx=false', () => {
    const onGrid: RiskProfileChoice = {
      market: 'us',
      rule: 'R1',
      period: 'penuh',
      tp: 10,
      sl: 10,
      h: 60,
    };
    expect(snapChoice(onGrid)).toEqual({ choice: onGrid, approx: false });
  });

  it('builds a stable cell key', () => {
    expect(riskCellKey({ period: 'penuh', tp: 10, sl: 'none', h: 504 })).toBe(
      'penuh|tp10_slnone_h504',
    );
  });
});

describe('risk-profile — per-market (ZITN-TECH-047)', () => {
  it('validates market ids and defaults an unknown one to us', () => {
    expect(isRiskMarket('us')).toBe(true);
    expect(isRiskMarket('id')).toBe(true);
    expect(isRiskMarket('jp')).toBe(false);
    const normalized = snapChoice({
      // A pre-047 stored choice carried no market.
      rule: 'R1',
      period: 'penuh',
      tp: 10,
      sl: 10,
      h: 60,
    } as unknown as RiskProfileChoice);
    expect(normalized.choice.market).toBe(DEFAULT_RISK_MARKET);
    expect(normalized.approx).toBe(false);
  });
});

describe('portfolioComponents — skala in-sample w×S (ZITN-TECH-043)', () => {
  it('default w=2% / S=20: eksposur 40%, w×min, w×E net', () => {
    const pc = portfolioComponents(cell, 2, 20);
    expect(pc.exposureMax).toBeCloseTo(0.4, 10); // 2% × 20
    expect(pc.worstOne).toBeCloseTo(0.02 * cell.min, 10); // w × min
    expect(pc.p5One).toBeCloseTo(0.02 * cell.p5, 10);
    expect(pc.perTrade).toBeCloseTo(0.02 * cell.e_net, 10); // w × E net
    expect(pc.simultaneousP5).toBeCloseTo(0.4 * cell.p5, 10); // w × S × p5
  });
});
