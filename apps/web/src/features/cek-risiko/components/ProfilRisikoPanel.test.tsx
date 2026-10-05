// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The grid is private and fetched at runtime; tests feed a tiny FIXTURE.
vi.mock('../hooks/useRiskProfileData', () => ({
  useRiskProfileData: () => ({
    data: {
      generated: '2026-01-01T00:00:00Z',
      cost: 0.002,
      cooldown: 40,
      label_basis: 'In-sample',
      rules: {
        R1: {
          label: 'One',
          grid: {
            'penuh|tp10_slnone_h504': {
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
            },
            'penuh|tp5_sl10_h60': {
              n: 10,
              r_r: 1,
              breakeven: 0.5,
              p_tp: 0.4,
              p_sl: 0.5,
              e_net: -0.05,
              median: 0.01,
              p5: -0.05,
              p1: -0.05,
              min: -0.05,
              p_loss10: 0,
              p_loss20: 0,
              p_loss40: 0,
            },
          },
        },
      },
    },
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

describe('ProfilRisikoPanel — segmen "Profil risiko" (ZITN-TECH-043)', () => {
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
    seed({ rule: 'R1', period: 'penuh', tp: 5, sl: 10, h: 60 });
    render(<ProfilRisikoPanel />);
    expect(screen.getByTestId('cek-profile-warn-fragile')).toBeTruthy();
    expect(screen.getByTestId('cek-profile-gauge')).toBeTruthy();
  });

  it('blok "Komponen portofolio (w×S)" tampil dengan default w=2% / S=20', () => {
    render(<ProfilRisikoPanel />);
    expect(screen.getByTestId('cek-profile-portfolio')).toBeTruthy();
    expect((screen.getByTestId('cek-profile-w') as HTMLInputElement).value).toBe('2');
    expect((screen.getByTestId('cek-profile-s') as HTMLInputElement).value).toBe('20');
    expect(screen.getByTestId('cek-profile-portfolio-note').textContent).toContain('w 2%');
  });
});
