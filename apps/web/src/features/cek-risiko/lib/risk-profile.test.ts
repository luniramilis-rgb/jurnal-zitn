import { describe, expect, it } from 'vitest';

import {
  RISK_PERIODS,
  RISK_PROFILE,
  RISK_PROFILE_DEFAULTS,
  lookupRiskProfile,
  riskCellKey,
  snapChoice,
  type RiskProfileChoice,
} from './risk-profile';

describe('risk_profile.json — kontrak & lookup (ZITN-TECH-043)', () => {
  it('memuat kedua rule dengan 225 sel (3 periode × 5 TP × 5 SL × 3 H)', () => {
    expect(Object.keys(RISK_PROFILE.rules).sort()).toEqual([
      'V4_MOMENTUM_BULL',
      'V5_ABSORPSI_BEAR',
    ]);
    for (const rule of Object.values(RISK_PROFILE.rules)) {
      expect(Object.keys(rule.grid)).toHaveLength(225);
    }
    expect(RISK_PERIODS).toEqual(['penuh', 'modern', '2025']);
  });

  it('lookup default V4 (penuh/tp10/noSL/h504) mengembalikan sel apa adanya', () => {
    const { cell, approx } = lookupRiskProfile(RISK_PROFILE_DEFAULTS.V4_MOMENTUM_BULL);
    expect(approx).toBe(false);
    expect(cell).not.toBeNull();
    expect(cell?.p_tp).toBeCloseTo(0.8731, 4);
    // Tanpa SL: R:R & impas tidak terdefinisi.
    expect(cell?.r_r).toBeNull();
    expect(cell?.breakeven).toBeNull();
  });

  it('off-grid dibulatkan ke sel terdekat dan ditandai "pendekatan"', () => {
    const choice: RiskProfileChoice = {
      rule: 'V4_MOMENTUM_BULL',
      period: 'penuh',
      tp: 12, // → 10 (|12-10| < |12-15|)
      sl: 11, // → 10
      h: 100, // → 60
    };
    const { approx, used, cell } = lookupRiskProfile(choice);
    expect(approx).toBe(true);
    expect(used.tp).toBe(10);
    expect(used.sl).toBe(10);
    expect(used.h).toBe(60);
    expect(cell).not.toBeNull();
    // Sel yang dipakai benar-benar ada di grid (kunci cocok).
    expect(RISK_PROFILE.rules.V4_MOMENTUM_BULL.grid[riskCellKey(used)]).toBeDefined();
  });

  it('snapChoice menjaga nilai yang sudah on-grid tetap approx=false', () => {
    const onGrid: RiskProfileChoice = {
      rule: 'V5_ABSORPSI_BEAR',
      period: '2025',
      tp: 30,
      sl: 'none',
      h: 252,
    };
    const { approx, choice: used } = snapChoice(onGrid);
    expect(approx).toBe(false);
    expect(used).toEqual(onGrid);
  });
});
