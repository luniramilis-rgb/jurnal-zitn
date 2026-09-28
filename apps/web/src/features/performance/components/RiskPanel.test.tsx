// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { RiskStats } from '@jurnal-zitn/shared';

import { setAppLocale } from '@/lib/locale';

import { RiskPanel } from './RiskPanel';

const FULL: RiskStats = {
  sharpe: 1.5,
  sortino: 2,
  calmar: 0.8,
  maxDrawdown: 1500,
  maxDrawdownPct: 12.5,
  drawdownPeriods: 4,
  avgR: 0.4,
  expectancyR: 0.4,
  rHistogram: [
    { min: null, max: -2, count: 0 },
    { min: -2, max: -1, count: 1 },
  ],
  rollingWindow: 20,
  rollingWinRate: 55,
  bySymbol: [
    { key: 'BBRI', trades: 3, avgR: 0.6, expectancyR: 0.6 },
    { key: 'TLKM', trades: 2, avgR: -0.5, expectancyR: -0.5 },
  ],
};

beforeEach(() => setAppLocale('en'));
afterEach(() => {
  setAppLocale('id');
  cleanup();
});

describe('RiskPanel (F1)', () => {
  it('renders nothing when risk is undefined', () => {
    const { container } = render(<RiskPanel risk={undefined} currency="IDR" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the ratio rows and the per-symbol table', () => {
    render(<RiskPanel risk={FULL} currency="IDR" />);
    expect(screen.getByTestId('risk-panel')).toBeTruthy();
    expect(screen.getByText('Risk Analytics')).toBeTruthy();
    expect(screen.getByText('Sharpe')).toBeTruthy();
    expect(screen.getByText('Average R')).toBeTruthy();
    expect(screen.getByText('Win rate, last 20 trades')).toBeTruthy();
    // Per-symbol breakdown.
    expect(screen.getByTestId('risk-by-symbol')).toBeTruthy();
    expect(screen.getByText('BBRI')).toBeTruthy();
    expect(screen.getByText('TLKM')).toBeTruthy();
    // R histogram.
    expect(screen.getByTestId('risk-histogram')).toBeTruthy();
    expect(screen.getByText('< -2R')).toBeTruthy();
  });

  it('shows the not-enough-data message when every ratio is null', () => {
    const empty: RiskStats = {
      sharpe: null,
      sortino: null,
      calmar: null,
      maxDrawdown: 0,
      maxDrawdownPct: null,
      drawdownPeriods: 0,
      avgR: null,
      expectancyR: null,
      rHistogram: [],
      rollingWindow: 20,
      rollingWinRate: null,
      bySymbol: [],
    };
    render(<RiskPanel risk={empty} currency="IDR" />);
    expect(screen.getByText('Not enough data for risk analytics yet.')).toBeTruthy();
    // The per-symbol table is absent when there are no rows.
    expect(screen.queryByTestId('risk-by-symbol')).toBeNull();
  });
});
