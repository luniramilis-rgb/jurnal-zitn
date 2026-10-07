// @vitest-environment jsdom
//
// The "Hitung Lot" tab on Cek Risiko is hidden while its surface is reworked
// (frontendFlags.HITUNG_LOT_ENABLED = false, ZITN-TECH-049). This file guards the
// hidden default: no lot tab/panel, the page opens on "Profil risiko", and the
// tab order is Profil risiko → Biaya dan pajak. The enabled rendering (and the
// lot behaviour) lives in CekRisikoPage.test.tsx.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/frontendFlags', () => ({
  CHANGELOG_ENABLED: false,
  DOCS_LINKS_ENABLED: false,
  HITUNG_LOT_ENABLED: false,
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
  },
  isUnauthorized: () => false,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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
    data: [{ id: 'a1', name: 'Utama', currency: 'IDR', isDefault: true }],
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

import { CekRisikoPage } from './CekRisikoPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client }, createElement(CekRisikoPage)));
}

afterEach(cleanup);

describe('CekRisikoPage — "Hitung Lot" disembunyikan (ZITN-TECH-049)', () => {
  it('tanpa tab Hitung Lot, membuka dengan Profil risiko, urut Profil lalu Biaya', () => {
    renderPage();

    expect(screen.queryByTestId('cek-mode-lot')).toBeNull();
    expect(screen.queryByTestId('cek-modal')).toBeNull();
    expect(screen.getByTestId('cek-profile')).toBeTruthy();

    const ids = Array.from(
      screen.getByTestId('cek-modes').querySelectorAll('[data-testid^="cek-mode-"]'),
    ).map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual(['cek-mode-profil', 'cek-mode-biaya']);
  });
});
