// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

import { formatCurrency } from './format';
import { getAppLocale, setAppLocale } from './locale';

// Setup uji memakai `en`; suite ini menguji default produk `id`.
setAppLocale('id');

/**
 * Penjaga locale produk (ZITN-TECH-017 A0): default `id`, dan `en` benar-benar
 * mengubah format saat dipilih.
 */
describe('locale produk', () => {
  afterEach(() => setAppLocale('id'));

  it('default id-ID', () => {
    expect(getAppLocale()).toBe('id');
    expect(formatCurrency(1234, 'IDR')).toMatch(/^Rp\s?1\.234$/);
    expect(formatCurrency(1234.5, 'USD')).toBe('US$1.234,50');
  });

  it('beralih ke en-US setelah setAppLocale', () => {
    setAppLocale('en');
    expect(getAppLocale()).toBe('en');
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
  });

  it('nilai tak dikenal jatuh ke default id', () => {
    setAppLocale('fr');
    expect(getAppLocale()).toBe('id');
  });
});
