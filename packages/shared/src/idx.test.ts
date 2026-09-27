import { describe, expect, it } from 'vitest';

import {
  computePphFinal,
  IDX_SHARES_PER_LOT,
  idxTickSize,
  isValidIdxTick,
  lotsToShares,
  PPH_FINAL_RATE_PERCENT,
  roundToIdxTick,
  sharesToLots,
} from './idx';

describe('lot IDX', () => {
  it('1 lot = 100 saham', () => {
    expect(IDX_SHARES_PER_LOT).toBe(100);
    expect(lotsToShares(10)).toBe('1000');
    expect(sharesToLots('1000')).toBe('10');
    expect(sharesToLots('250')).toBe('2.5');
  });
});

describe('tick size IDX', () => {
  it('memilih tick per pita harga', () => {
    expect(idxTickSize(150)).toBe('1');
    expect(idxTickSize(200)).toBe('2');
    expect(idxTickSize(500)).toBe('5');
    expect(idxTickSize(2000)).toBe('10');
    expect(idxTickSize(5000)).toBe('25');
  });

  it('roundToIdxTick membulatkan ke kelipatan terdekat', () => {
    expect(roundToIdxTick(151)).toBe('151');
    expect(roundToIdxTick(201)).toBe('202');
    expect(roundToIdxTick(503)).toBe('505');
    expect(roundToIdxTick(2006)).toBe('2010');
    expect(roundToIdxTick(5020)).toBe('5025');
    // 5012 lebih dekat ke 5000 (12) daripada 5025 (13).
    expect(roundToIdxTick(5012)).toBe('5000');
  });

  it('isValidIdxTick benar hanya untuk kelipatan sah', () => {
    expect(isValidIdxTick(150)).toBe(true);
    expect(isValidIdxTick(202)).toBe(true);
    expect(isValidIdxTick(505)).toBe(true);
    expect(isValidIdxTick(201)).toBe(false);
    expect(isValidIdxTick(503)).toBe(false);
    expect(isValidIdxTick(5012)).toBe(false);
  });
});

describe('PPh final IDX', () => {
  it('tarif 0,1% dari nilai penjualan', () => {
    expect(PPH_FINAL_RATE_PERCENT).toBe('0.1');
    // 10.000.000 × 0,1% = 10.000
    expect(computePphFinal('10000000')).toBe('10000');
  });

  it('membulatkan 2 desimal half-up', () => {
    expect(computePphFinal('1234.56')).toBe('1.23');
    expect(computePphFinal('0')).toBe('0');
  });
});
