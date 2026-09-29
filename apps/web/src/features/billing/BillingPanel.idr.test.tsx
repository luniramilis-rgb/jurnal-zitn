// @vitest-environment jsdom
// D1 guard (ZITN-TECH-021 §5.21): credit-pack prices are IDR — the currency is
// MIRRORED from Stripe at runtime, never assumed. A non-IDR pack must fail loud
// instead of rendering a currency we did not decide on. This test proves the
// guard can actually fail with a fake value.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CreditPack } from '@jurnal-zitn/shared';

import { setAppLocale } from '@/lib/locale';

import { BillingPanel, assertIdrCurrency } from './BillingPanel';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./useWalletBalance', () => ({
  useWalletBalance: () => ({ data: null, isLoading: false }),
}));
vi.mock('./useCreateCheckout', () => ({
  useCreateCheckout: () => ({ mutate: vi.fn(), isPending: false }),
}));

const PACK_IDR: CreditPack = {
  id: 'pack-idr',
  label: 'Pack',
  priceMinor: 50_000,
  currency: 'IDR',
  credits: '5000000',
};
const PACK_USD: CreditPack = { ...PACK_IDR, id: 'pack-usd', currency: 'USD' };

afterEach(() => {
  setAppLocale('id');
  cleanup();
  vi.clearAllMocks();
});

describe('assertIdrCurrency (D1)', () => {
  it('accepts IDR and rejects anything else', () => {
    expect(() => assertIdrCurrency('IDR')).not.toThrow();
    expect(() => assertIdrCurrency('USD')).toThrow(/IDR/);
    expect(() => assertIdrCurrency('')).toThrow(/IDR/);
  });
});

describe('BillingPanel — IDR guard renders fail-loud', () => {
  it('renders an IDR pack without throwing', () => {
    setAppLocale('en');
    render(<BillingPanel packs={[PACK_IDR]} />);
    expect(document.querySelector('[data-testid="credit-pack-pack-idr"]')).not.toBeNull();
  });

  it('throws when a mirrored pack carries a non-IDR currency (fake value)', () => {
    setAppLocale('en');
    expect(() => render(<BillingPanel packs={[PACK_USD]} />)).toThrow(/IDR/);
  });
});
