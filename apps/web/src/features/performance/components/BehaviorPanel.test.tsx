// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { BehaviorStats } from '@jurnal-zitn/shared';

import { setAppLocale } from '@/lib/locale';

import { BehaviorPanel } from './BehaviorPanel';

const FULL: BehaviorStats = {
  overtrading: { activeDays: 5, overDayCount: 1, overDayRate: 0.2, threshold: 17.55, mean: 4.8 },
  revenge: { windowMinutes: 30, revengeCount: 2, revengeRate: 0.1 },
  discipline: { taggedRate: 0.5, noRevengeRate: 0.9, noOvertradingRate: 0.8, score: 72.5 },
};

beforeEach(() => setAppLocale('en'));
afterEach(() => {
  setAppLocale('id');
  cleanup();
});

describe('BehaviorPanel (F3)', () => {
  it('renders nothing without behavior data', () => {
    const { container } = render(<BehaviorPanel behavior={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the discipline score, overtrading and revenge figures', () => {
    render(<BehaviorPanel behavior={FULL} />);
    expect(screen.getByTestId('behavior-panel')).toBeTruthy();
    expect(screen.getByText('Behaviour & Discipline')).toBeTruthy();
    expect(screen.getByTestId('behavior-score').textContent).toContain('72.5');
    expect(screen.getByText('Overtrading days')).toBeTruthy();
    expect(screen.getByText('30 minutes')).toBeTruthy();
  });

  it('computes Kelly, half-Kelly and risk of ruin from the calculator inputs', () => {
    render(<BehaviorPanel behavior={FULL} />);
    // Defaults: win 60%, payoff 2 → Kelly 40%, half 20%; ruin at 10 units → 1.7%.
    expect(screen.getByTestId('calc-kelly').textContent).toContain('40');
    expect(screen.getByTestId('calc-half-kelly').textContent).toContain('20');
    expect(screen.getByTestId('calc-ruin').textContent).toContain('1.7');
  });

  it('shows the empty message when no trades closed', () => {
    const empty: BehaviorStats = {
      overtrading: { activeDays: 0, overDayCount: 0, overDayRate: 0, threshold: null, mean: null },
      revenge: { windowMinutes: 30, revengeCount: 0, revengeRate: 0 },
      discipline: { taggedRate: 0, noRevengeRate: 0, noOvertradingRate: 0, score: null },
    };
    render(<BehaviorPanel behavior={empty} />);
    expect(screen.getByText('No closed trades to analyse yet.')).toBeTruthy();
  });
});
