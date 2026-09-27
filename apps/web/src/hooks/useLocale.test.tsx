// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatCurrency } from '@/lib/format';
import { setAppLocale } from '@/lib/locale';

import { LocaleProvider, useLocale } from './useLocale';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ locale: 'id' }),
    put: vi.fn().mockResolvedValue({ locale: 'en' }),
  },
}));

function Probe() {
  const { locale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="loc">{locale}</span>
      <span data-testid="money">{formatCurrency(1234.5, 'USD')}</span>
      <button type="button" onClick={() => setLocale('en')}>
        en
      </button>
    </div>
  );
}

function renderWithProviders() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('LocaleProvider — bahasa mengubah format saat berjalan (A0)', () => {
  afterEach(() => setAppLocale('id'));

  it('me-render ulang subtree sehingga format angka ikut berubah', () => {
    renderWithProviders();
    expect(screen.getByTestId('loc').textContent).toBe('id');
    expect(screen.getByTestId('money').textContent).toBe('US$1.234,50');

    fireEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(screen.getByTestId('loc').textContent).toBe('en');
    expect(screen.getByTestId('money').textContent).toBe('$1,234.50');
  });
});
