// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { setAppLocale } from '@/lib/locale';
import { eventBus } from '@/stores/event-bus.store';

import { LocaleProvider, useLocale } from './useLocale';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
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
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    </QueryClientProvider>,
  );
  return client;
}

describe('LocaleProvider — bahasa mengubah format saat berjalan (A0)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.get).mockResolvedValue({ locale: 'en', stored: true });
    vi.mocked(api.put).mockResolvedValue({ locale: 'en', stored: true });
  });

  afterEach(() => {
    cleanup();
    eventBus.__resetForTests();
    setAppLocale('id');
  });

  it('me-render ulang subtree sehingga format angka ikut berubah', async () => {
    // No session yet and nothing stored: the first paint is the product default.
    renderWithProviders();
    expect(screen.getByTestId('loc').textContent).toBe('id');
    expect(screen.getByTestId('money').textContent).toBe('US$1.234,50');

    // The server's stored choice supersedes it, and the subtree re-renders.
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('en'));
    expect(screen.getByTestId('money').textContent).toBe('$1,234.50');
  });

  it('menyemai bahasa browser sekali ketika baris belum pernah memilih (stored: false)', async () => {
    // jsdom reports `navigator.language === 'en-US'`.
    vi.mocked(api.get).mockResolvedValue({ locale: 'id', stored: false });
    renderWithProviders();

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/users/me/locale', { locale: 'en' }));
    expect(screen.getByTestId('loc').textContent).toBe('en');
  });

  it('tidak menerapkan default server saat stored: false, dan tidak menulis bila browser cocok', async () => {
    vi.mocked(api.get).mockResolvedValue({ locale: 'id', stored: false });
    Object.defineProperty(window.navigator, 'language', { value: 'id-ID', configurable: true });
    try {
      renderWithProviders();
      await waitFor(() => expect(api.get).toHaveBeenCalled());
      // Let the query settle and the seed effect run before asserting it skipped.
      await act(async () => {});
      // Server default `id` and the browser agree, so nothing is written and the
      // paint stays the product default rather than flashing.
      expect(api.put).not.toHaveBeenCalled();
      expect(screen.getByTestId('loc').textContent).toBe('id');
    } finally {
      // `language` lives on the prototype; deleting the own property restores it.
      delete (window.navigator as { language?: string }).language;
    }
  });

  it('menyemai lagi untuk pengguna berikutnya setelah sesi dibersihkan', async () => {
    // A fresh, non-identical result per call: React Query's structural sharing
    // keeps the SAME reference for deeply-equal data, so the `nonce` stands in
    // for the genuinely different row a second user brings.
    let nonce = 0;
    vi.mocked(api.get).mockImplementation(async () => ({
      locale: 'id',
      stored: false,
      nonce: ++nonce,
    }));
    const client = renderWithProviders();
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));

    // `clearClientSessionState` empties the cache and announces the teardown; the
    // observer then re-creates the query and fetches a fresh result.
    await act(async () => {
      eventBus.publish('auth:logout', {});
      await client.refetchQueries({ queryKey: ['users', 'me', 'locale'] });
    });

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2));
  });

  it('setLocale menyimpan pilihan terbaru ke server', async () => {
    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('en'));
    vi.mocked(api.put).mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'en' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/users/me/locale', { locale: 'en' }));
  });
});
