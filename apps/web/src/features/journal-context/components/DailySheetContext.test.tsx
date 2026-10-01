// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAppLocale } from '@/lib/locale';

import { useSheetContext } from '../hooks/useSheetContext';

import { DailySheetContext } from './DailySheetContext';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../hooks/useSheetContext', () => ({ useSheetContext: vi.fn() }));

const refetch = vi.fn();

function setQuery(value: unknown) {
  vi.mocked(useSheetContext).mockReturnValue({
    data: undefined,
    isLoading: false,
    refetch,
    ...(value as object),
  } as never);
}

beforeEach(() => setAppLocale('en'));
afterEach(() => {
  setAppLocale('id');
  cleanup();
  vi.clearAllMocks();
});

describe('DailySheetContext — konteks lembar (ZITN-TECH-019)', () => {
  it('menampilkan status memuat', () => {
    setQuery({ isLoading: true });
    render(<DailySheetContext tanggal="2026-09-27" />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('menampilkan cuplikan: tanggal, asof, simbol, level watch', () => {
    setQuery({
      data: {
        ok: true,
        tersedia: true,
        tanggal: '2026-09-27',
        asof: '2026-09-27',
        simbol: [
          { market: 'ID', ticker: 'BBBB' },
          { market: 'US', ticker: 'CCCC' },
        ],
        level_watch: [{ market: 'ID', ticker: 'AAAA' }],
      },
    });

    render(<DailySheetContext tanggal="2026-09-27" />);

    expect(screen.getByRole('heading', { name: 'Scanner' })).toBeTruthy();
    // Tanggal dan asof sama-sama "2026-09-27" pada kasus ini.
    expect(screen.getAllByText('2026-09-27').length).toBeGreaterThan(0);
    // Simbol & level watch adalah ticker + pasar, bukan harga.
    expect(screen.getByText('BBBB')).toBeTruthy();
    expect(screen.getByText('CCCC')).toBeTruthy();
    expect(screen.getByText('AAAA')).toBeTruthy();
  });

  it('merender baris lembar ber-harga saat jembatan mengirimnya (Fase 3b)', () => {
    setQuery({
      data: {
        ok: true,
        tersedia: true,
        tanggal: '2026-09-27',
        asof: '2026-09-27',
        simbol: [],
        level_watch: [],
        rows: [
          {
            market: 'ID',
            ticker: 'BBBB',
            name: null,
            kind: 'signal',
            date: '2026-09-27',
            direction: null,
            order_type: null,
            rule: null,
            entry: 1234,
            target: 1400,
            stop: 1150,
            entry_prev_close: null,
            distance_pct: 1.2,
            size_qty: null,
            size_unit: null,
            data_status: 'OK',
            evidence_status: null,
          },
        ],
      },
    });

    render(<DailySheetContext tanggal="2026-09-27" />);

    expect(screen.getByText('Sheet rows')).toBeTruthy();
    expect(screen.getAllByTestId('sheet-row')).toHaveLength(1);
    expect(screen.getByText('BBBB')).toBeTruthy();
  });

  it('menjelaskan saat akun belum tertaut ke ZITN (409)', () => {
    setQuery({
      data: {
        ok: false,
        tersedia: false,
        tanggal: '2026-09-27',
        asof: null,
        simbol: [],
        level_watch: [],
        error: 'belum_tertaut',
      },
    });
    render(<DailySheetContext tanggal="2026-09-27" />);
    expect(screen.getByText(/not linked to ZITN/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
  });

  it('menjelaskan saat konteks dimatikan ZITN (503)', () => {
    setQuery({
      data: {
        ok: false,
        tersedia: false,
        tanggal: null,
        asof: null,
        simbol: [],
        level_watch: [],
        error: 'konteks_nonaktif',
      },
    });
    render(<DailySheetContext tanggal={null} />);
    expect(screen.getByText('Sheet context is currently unavailable.')).toBeTruthy();
  });

  it('menjelaskan saat lembar tanggal itu tidak tersedia', () => {
    setQuery({
      data: {
        ok: false,
        tersedia: false,
        tanggal: '2026-01-01',
        asof: null,
        simbol: [],
        level_watch: [],
        error: 'tidak_tersedia',
      },
    });
    render(<DailySheetContext tanggal="2026-01-01" />);
    expect(screen.getByText('No sheet is available for this date.')).toBeTruthy();
  });
});

it('menautkan simbol IDX & US ke chart ZITN (ZITN-TECH-025) di tab baru, tanpa menggambar chart', () => {
  setQuery({
    data: {
      ok: true,
      tersedia: true,
      tanggal: '2026-09-27',
      asof: '2026-09-27',
      simbol: [
        {
          market: 'ID',
          ticker: 'BBRI',
          chartUrl: 'https://zenitn.test/daily/chart/?tanggal=2026-09-27#BBRI',
        },
        {
          market: 'US',
          ticker: 'AAPL',
          chartUrl: 'https://zenitn.test/daily/chart/?pasar=us#AAPL',
        },
      ],
      level_watch: [{ market: 'US', ticker: 'MSFT' }],
    },
  });

  render(<DailySheetContext tanggal="2026-09-27" />);

  const links = screen.getAllByRole('link', { name: 'Open the chart in the Daily sheet' });
  // Tautan mengikuti chartUrl dari ZITN (IDX & US); entri tanpa chartUrl tetap teks biasa.
  expect(links).toHaveLength(2);
  expect(links.map((a) => a.getAttribute('href'))).toEqual([
    'https://zenitn.test/daily/chart/?tanggal=2026-09-27#BBRI',
    'https://zenitn.test/daily/chart/?pasar=us#AAPL',
  ]);
  // Tab baru agar jurnal tetap terbuka.
  for (const link of links) {
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
  }
  // Entri tanpa chartUrl tetap teks biasa (bukan tautan harga apa pun).
  expect(screen.getByText('MSFT')).toBeTruthy();
});
