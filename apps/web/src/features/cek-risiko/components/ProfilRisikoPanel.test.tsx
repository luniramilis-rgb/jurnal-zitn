// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
    expect(screen.getByTestId('cek-profile-current').textContent).toContain('Momentum');
    expect(screen.getByTestId('cek-profile-insample').textContent).toContain('In-sample');
    expect(screen.getByText('R:R')).toBeTruthy();
    expect(screen.getByText('Breakeven P(TP)')).toBeTruthy();
    expect(screen.getByText('P(TP)')).toBeTruthy();
    expect(screen.getByText('E net')).toBeTruthy();
  });

  it('default V4 (tanpa SL) → peringatan ekor dalam', () => {
    render(<ProfilRisikoPanel />);
    // p_loss40 = 0.0167 > 0 pada penuh/tp10/noSL/h504.
    expect(screen.getByTestId('cek-profile-warn-tail')).toBeTruthy();
  });

  it('TP%/SL% berupa dropdown dengan opsi yang diminta', () => {
    render(<ProfilRisikoPanel />);
    const tp = screen.getByTestId('cek-profile-tp') as HTMLSelectElement;
    expect(Array.from(tp.options).map((o) => o.value)).toEqual(['5', '10', '15', '20', '25', '30']);
    const sl = screen.getByTestId('cek-profile-sl') as HTMLSelectElement;
    expect(Array.from(sl.options).map((o) => o.value)).toEqual([
      'none',
      '5',
      '10',
      '15',
      '20',
      '25',
      '30',
      '50',
    ]);
  });

  it('config rapuh (P(TP) < impas) → peringatan rapuh + gauge', () => {
    seed({ rule: 'V4_MOMENTUM_BULL', period: 'penuh', tp: 5, sl: 10, h: 60 });
    render(<ProfilRisikoPanel />);
    expect(screen.getByTestId('cek-profile-warn-fragile')).toBeTruthy();
    expect(screen.getByTestId('cek-profile-gauge')).toBeTruthy();
  });
});
