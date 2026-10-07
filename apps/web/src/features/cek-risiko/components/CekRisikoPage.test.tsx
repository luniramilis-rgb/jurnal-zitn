// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement, Fragment, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { ACCOUNT_ID, POSITION_ID, apiPost, toastSuccess, toastError } = vi.hoisted(() => ({
  ACCOUNT_ID: '11111111-1111-1111-1111-111111111111',
  POSITION_ID: '99999999-9999-9999-9999-999999999999',
  apiPost: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: apiPost,
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
  },
  isUnauthorized: () => false,
}));

vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

// Surface-permission flags: this file covers the app WITH the "Hitung Lot" tab
// enabled (frontendFlags.HITUNG_LOT_ENABLED = true). The hidden default is
// guarded in CekRisikoPage.hitung-lot-hidden.test.tsx.
vi.mock('@/lib/frontendFlags', () => ({
  CHANGELOG_ENABLED: false,
  DOCS_LINKS_ENABLED: false,
  HITUNG_LOT_ENABLED: true,
}));

vi.mock('@/stores/event-bus.store', () => ({
  eventBus: { publish: vi.fn(), subscribe: vi.fn(() => () => undefined) },
  useEventBusSubscribe: () => undefined,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) =>
    createElement('a', { href: to, ...rest }, children),
}));

vi.mock('@/features/accounts/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [{ id: ACCOUNT_ID, name: 'Utama', currency: 'IDR', isDefault: true }],
    isLoading: false,
  }),
}));

vi.mock('@/features/positions/hooks/usePositions', () => ({
  usePositions: () => ({ data: [], isLoading: false }),
  getPositionErrorCode: () => undefined,
}));

vi.mock('@/features/billing/useTierState', () => ({
  useTierState: () => ({ data: undefined }),
}));

vi.mock('@/components/SymbolAutocomplete', () => ({
  SymbolAutocomplete: ({
    value,
    onChange,
    onQueryChange,
  }: {
    value: string;
    onChange?: (v: string) => void;
    onQueryChange?: (v: string) => void;
  }) =>
    createElement('input', {
      'data-testid': 'cek-symbol-input',
      value,
      onChange: (e: { target: { value: string } }) => {
        onChange?.(e.target.value);
        onQueryChange?.(e.target.value);
      },
    }),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: ReactNode;
  }) =>
    createElement(
      'select',
      {
        value,
        onChange: (e: { currentTarget: { value: string } }) => onValueChange(e.currentTarget.value),
      },
      children,
    ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children),
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) =>
    createElement('option', { value }, children),
}));

import { CekRisikoPage } from './CekRisikoPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client }, createElement(CekRisikoPage)));
}

function setValue(testId: string, value: string): void {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

afterEach(cleanup);

beforeEach(() => {
  apiPost.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  apiPost
    .mockResolvedValueOnce({ id: POSITION_ID })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({});
});

describe('CekRisikoPage — mode ringkas (H1)', () => {
  it('menampilkan mode dan menggantinya', () => {
    renderPage();
    expect(screen.getByTestId('cek-mode-lot')).toBeTruthy();
    expect(screen.getByTestId('cek-mode-biaya')).toBeTruthy();
    expect(screen.getByTestId('cek-modal')).toBeTruthy();

    fireEvent.click(screen.getByTestId('cek-mode-biaya'));
    expect(screen.queryByTestId('cek-modal')).toBeNull();
    expect(document.querySelector('select')).toBeTruthy();
  });

  it('menaruh "Profil risiko" sebelum "Biaya dan pajak"', () => {
    renderPage();
    const ids = Array.from(
      screen.getByTestId('cek-modes').querySelectorAll('[data-testid^="cek-mode-"]'),
    ).map((el) => el.getAttribute('data-testid'));
    expect(ids.indexOf('cek-mode-profil')).toBeLessThan(ids.indexOf('cek-mode-biaya'));
  });

  it('menampilkan segmen "Profil risiko" di dalam tab Cek Risiko (bukan tab baru)', () => {
    renderPage();
    expect(screen.getByTestId('cek-mode-profil')).toBeTruthy();
    fireEvent.click(screen.getByTestId('cek-mode-profil'));
    expect(screen.getByTestId('cek-profile')).toBeTruthy();
    expect(screen.queryByTestId('cek-modal')).toBeNull();
  });

  it('verdict 3 tingkat pada risiko 1% / 2% / 3% (D-H2)', () => {
    renderPage();
    expect(screen.getByTestId('cek-verdict').getAttribute('data-level')).toBe('aman');
    fireEvent.click(screen.getByTestId('cek-risk-2'));
    expect(screen.getByTestId('cek-verdict').getAttribute('data-level')).toBe('kuning');
    fireEvent.click(screen.getByTestId('cek-risk-3'));
    expect(screen.getByTestId('cek-verdict').getAttribute('data-level')).toBe('tinggi');
  });

  it('menghitung lot dari modal, harga beli, dan stop', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('cek-risk-2'));
    setValue('cek-modal', '10000000');
    setValue('cek-harga-beli', '4520');
    setValue('cek-harga-stop', '4300');

    expect(screen.getByTestId('cek-lots').textContent).toContain('9');
    // Bridge to the portfolio layer: implied w + the risk% = w × SL% identity.
    expect(screen.getByText(/Implied w/)).toBeTruthy();
    expect(screen.getByText(/Risk% = w × SL%/)).toBeTruthy();
  });

  it('prefill kode/harga dari konteks Pemindai/Chart (?symbol=&harga=)', () => {
    window.history.replaceState({}, '', '/cek-risiko?symbol=bbri&harga=4520');
    try {
      renderPage();
      expect((screen.getByTestId('cek-symbol-input') as HTMLInputElement).value).toBe('BBRI');
      expect((screen.getByTestId('cek-harga-beli') as HTMLInputElement).value).toBe('4520');
    } finally {
      window.history.replaceState({}, '', '/cek-risiko');
    }
  });

  it('Simpan ke Catatan membuat posisi + fill lewat mesin jurnal (H2/D-H3)', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('cek-risk-2'));
    setValue('cek-symbol-input', 'bbca');
    setValue('cek-modal', '10000000');
    setValue('cek-harga-beli', '4520');
    setValue('cek-harga-stop', '4300');

    fireEvent.click(screen.getByTestId('cek-simpan'));

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(3));
    expect(apiPost).toHaveBeenNthCalledWith(1, '/positions', {
      accountId: ACCOUNT_ID,
      symbol: 'BBCA',
      side: 'long',
      assetType: 'stock',
    });
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      `/positions/${POSITION_ID}/fills`,
      expect.objectContaining({ type: 'entry', price: '4520', quantity: '900', fees: '0' }),
    );
    // Draft → open once the entry fill exists, or the position never shows in
    // "Posisi Saya" (which filters status=open).
    expect(apiPost).toHaveBeenNthCalledWith(3, `/positions/${POSITION_ID}/open`, {});
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });
});
