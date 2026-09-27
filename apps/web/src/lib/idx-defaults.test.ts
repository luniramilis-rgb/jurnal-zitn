// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  CURRENCY_CODES,
  DEFAULT_ACCOUNT_TIMEZONE,
  getCurrencyMinorUnits,
} from '@jurnal-zitn/shared';

/**
 * Penjaga default lokalisasi IDX (ZITN-TECH-017 Fase 1): Rupiah didukung dan zona
 * hari-perdagangan akun default `Asia/Jakarta`.
 */
describe('default IDX', () => {
  it('IDR ada di whitelist mata uang', () => {
    expect(CURRENCY_CODES).toContain('IDR');
    expect(getCurrencyMinorUnits('IDR')).toBe(2);
  });

  it('zona akun default Asia/Jakarta', () => {
    expect(DEFAULT_ACCOUNT_TIMEZONE).toBe('Asia/Jakarta');
  });
});
