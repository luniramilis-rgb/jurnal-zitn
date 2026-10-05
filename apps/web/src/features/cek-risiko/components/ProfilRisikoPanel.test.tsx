// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The grids are private and fetched at runtime; tests feed tiny FIXTURES, one per
// market, through the hook mock (keyed by the requested market — ZITN-TECH-047).
const { PROFILES } = vi.hoisted(() => {
  const cell = (over: Record<string, unknown>) => ({
    n: 10,
    r_r: null,
    breakeven: null,
    p_tp: 0.87,
    p_sl: null,
    e_net: 0.1,
    median: 0.05,
    p5: -0.05,
    p1: -0.05,
    min: -0.05,
    p_loss10: 0,
    p_loss20: 0,
    p_loss40: 0.01,
    ...over,
  });
  return {
    PROFILES: {
      us: {
        generated: '2026-01-01T00:00:00Z',
        cost: 0.002,
        cooldown: 40,
        label_basis: 'In-sample',
        rules: {
          R1: {
            label: 'One',
            grid: {
              'penuh|tp10_slnone_h504': cell({}),
              'penuh|tp5_sl10_h60': cell({
                r_r: 1,
                breakeven: 0.5,
                p_tp: 0.4,
                p_sl: 0.5,
                e_net: -0.05,
                min: -0.05,
                p_loss40: 0,
              }),
            },
          },
        },
      },
      id: {
        generated: '2026-01-01T00:00:00Z',
        cost: 0.005,
        cooldown: 5,
        label_basis: 'In-sample',
        rules: {
          cross10_nosl: {
            label: 'cross10',
            grid: { 'penuh|tp5_slnone_h504': cell({}) },
          },
        },
      },
    },
  };
});

vi.mock('../hooks/useRiskProfileData', () => ({
  useRiskProfileData: (market: string) => ({
    data: (PROFILES as Record<string, unknown>)[market],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/features/accounts/hooks/useAccounts', () => ({
  useAccounts: () => ({
    data: [
      { id: 'a1', name: 'US', currency: 'USD', isDefault: true, balance: '50000' },
      { id: 'a2', name: 'IDX', currency: 'IDR', isDefault: false, balance: '250000000' },
    ],
    isLoading: false,
  }),
}));

import { ProfilRisikoPanel } from './ProfilRisikoPanel';

const STORAGE_KEY = 'zitn.cek-risiko.risk-profile.v1';

function seed(choice: Record<string, unknown>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('ProfilRisikoPanel — segmen "Profil risiko" (ZITN-TECH-043/047)', () => {
  it('menampilkan "Risiko saat ini" + statistik in-sample tanpa proyeksi P/L', () => {
    render(<ProfilRisikoPanel />);
    expect(screen.getByTestId('cek-profile-current').textContent).toContain('One');
    expect(screen.getByTestId('cek-profile-insample').textContent).toContain('In-sample');
    expect(screen.getByText('R:R')).toBeTruthy();
    expect(screen.getByText('Breakeven P(TP)')).toBeTruthy();
    expect(screen.getByText('P(TP)')).toBeTruthy();
    expect(screen.getByText('E net')).toBeTruthy();
  });

  it('grid default (tanpa SL) → peringatan ekor dalam', () => {
    render(<ProfilRisikoPanel />);
    expect(screen.getByTestId('cek-profile-warn-tail')).toBeTruthy();
  });

  it('TP%/SL% berupa dropdown dengan opsi yang diminta + "Tanpa SL" checkbox', () => {
    render(<ProfilRisikoPanel />);
    const tp = screen.getByTestId('cek-profile-tp') as HTMLSelectElement;
    expect(Array.from(tp.options).map((o) => o.value)).toEqual(['5', '10', '15', '20', '25', '30']);
    const sl = screen.getByTestId('cek-profile-sl') as HTMLSelectElement;
    expect(Array.from(sl.options).map((o) => o.value)).toEqual([
      '',
      '5',
      '10',
      '15',
      '20',
      '25',
      '30',
      '50',
    ]);
    expect(screen.getByTestId('cek-profile-nosl')).toBeTruthy();
  });

  it('config rapuh (P(TP) < impas) → peringatan rapuh + gauge', () => {
    seed({ market: 'us', rule: 'R1', period: 'penuh', tp: 5, sl: 10, h: 60 });
    render(<ProfilRisikoPanel />);
    expect(screen.getByTestId('cek-profile-warn-fragile')).toBeTruthy();
    expect(screen.getByTestId('cek-profile-gauge')).toBeTruthy();
  });

  it('menampilkan selektor pasar IDX/S&P 500; default US dengan catatan USD', () => {
    render(<ProfilRisikoPanel />);
    const select = screen.getByTestId('cek-profile-market-select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['us', 'id']);
    expect(select.value).toBe('us');
    expect(screen.getByTestId('cek-profile-market').textContent).toContain('S&P 500');
    expect(screen.getByTestId('cek-profile-market').textContent).toContain('USD');
  });

  it('pasar IDX menampilkan rule artefak IDX (cross10) + catatan IDR', async () => {
    // Stored rule 'nope' is absent from the IDX grid → the panel adopts its first
    // rule, which is the per-market default coming from the artifact.
    seed({ market: 'id', rule: 'nope', period: 'penuh', tp: 5, sl: 'none', h: 504 });
    render(<ProfilRisikoPanel />);
    await waitFor(() =>
      expect(screen.getByTestId('cek-profile-current').textContent).toContain('cross10'),
    );
    expect((screen.getByTestId('cek-profile-rule') as HTMLSelectElement).value).toBe(
      'cross10_nosl',
    );
    expect(screen.getByTestId('cek-profile-market').textContent).toContain('IDX');
    expect(screen.getByTestId('cek-profile-market').textContent).toContain('IDR');
  });

  it('mengganti pasar lewat selektor mengadopsi rule artefak pasar itu', async () => {
    render(<ProfilRisikoPanel />);
    fireEvent.change(screen.getByTestId('cek-profile-market-select'), { target: { value: 'id' } });
    await waitFor(() =>
      expect(screen.getByTestId('cek-profile-current').textContent).toContain('cross10'),
    );
  });

  it('blok "Komponen portofolio (w×S)" tampil dengan default w=2% / S=20 + modal dari akun USD', () => {
    render(<ProfilRisikoPanel />);
    expect(screen.getByTestId('cek-profile-portfolio')).toBeTruthy();
    expect((screen.getByTestId('cek-profile-w') as HTMLInputElement).value).toBe('2');
    expect((screen.getByTestId('cek-profile-s') as HTMLInputElement).value).toBe('20');
    expect((screen.getByTestId('cek-profile-capital') as HTMLInputElement).value).toBe('50000');
  });

  it('modal yang dikosongkan pengguna tidak diisi ulang otomatis (prefill sekali per pasar)', () => {
    render(<ProfilRisikoPanel />);
    const capital = screen.getByTestId('cek-profile-capital') as HTMLInputElement;
    expect(capital.value).toBe('50000');
    fireEvent.change(capital, { target: { value: '' } });
    expect(capital.value).toBe('');
  });
});
