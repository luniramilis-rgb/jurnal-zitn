// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SeriesBucket, TimeDistribution } from '@jurnal-zitn/shared';

import { setAppLocale } from '@/lib/locale';

import { TimeDistributionPanel } from './TimeDistributionPanel';

function weekdayBuckets() {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
    (label, i) => ({
      key: String(i),
      label,
      netPnl: i === 3 ? '60' : '0',
      trades: i === 3 ? 2 : 0,
      winRate: i === 3 ? 50 : null,
    }),
  );
}

const TIME: TimeDistribution = {
  weekday: weekdayBuckets(),
  hour: Array.from({ length: 24 }, (_, h) => ({
    key: String(h),
    label: `${h < 10 ? `0${h}` : h}:00`,
    netPnl: h === 19 ? '60' : '0',
    trades: h === 19 ? 2 : 0,
    winRate: h === 19 ? 50 : null,
  })),
};

const SERIES: SeriesBucket[] = [
  {
    bucketStart: '2026-03-02',
    netPnl: '30',
    grossPnl: '30',
    fees: '0',
    totalPositions: 1,
    wins: 1,
    losses: 0,
    breakevens: 0,
  },
  {
    bucketStart: '2026-03-03',
    netPnl: '-10',
    grossPnl: '-10',
    fees: '0',
    totalPositions: 1,
    wins: 0,
    losses: 1,
    breakevens: 0,
  },
  {
    bucketStart: '2026-03-04',
    netPnl: '40',
    grossPnl: '40',
    fees: '0',
    totalPositions: 1,
    wins: 1,
    losses: 0,
    breakevens: 0,
  },
];

beforeEach(() => setAppLocale('en'));
afterEach(() => {
  setAppLocale('id');
  cleanup();
});

function renderPanel(time: TimeDistribution | undefined) {
  return render(
    <TimeDistributionPanel
      time={time}
      series={SERIES}
      granularity="day"
      currency="IDR"
      timezone="Asia/Jakarta"
    />,
  );
}

describe('TimeDistributionPanel (F2)', () => {
  it('renders nothing when timeDistribution is absent', () => {
    const { container } = renderPanel(undefined);
    expect(container.firstChild).toBeNull();
  });

  it('renders the weekday rows and a 24-cell hour heatmap', () => {
    renderPanel(TIME);
    expect(screen.getByTestId('time-distribution-panel')).toBeTruthy();
    expect(screen.getByText('Time Distribution')).toBeTruthy();
    expect(screen.getByText('P&L & win rate by entry weekday')).toBeTruthy();
    expect(screen.getByText('Wednesday')).toBeTruthy();
    expect(screen.getByTestId('time-hour-heatmap').children).toHaveLength(24);
    expect(screen.getByText('Computed from entry time, Asia/Jakarta zone.')).toBeTruthy();
  });

  it('renders the per-period P&L distribution and its summary stats', () => {
    renderPanel(TIME);
    expect(screen.getByTestId('time-pnl-distribution')).toBeTruthy();
    expect(screen.getByText('Positive periods')).toBeTruthy();
    expect(screen.getByText('Best')).toBeTruthy();
    expect(screen.getByText('Worst')).toBeTruthy();
  });

  it('shows the empty message when no trade has an entry hour', () => {
    const empty: TimeDistribution = {
      weekday: TIME.weekday.map((r) => ({ ...r, netPnl: '0', trades: 0, winRate: null })),
      hour: TIME.hour.map((r) => ({ ...r, netPnl: '0', trades: 0, winRate: null })),
    };
    renderPanel(empty);
    expect(screen.getByText('No entered trades to analyse yet.')).toBeTruthy();
    expect(screen.queryByTestId('time-hour-heatmap')).toBeNull();
  });
});
