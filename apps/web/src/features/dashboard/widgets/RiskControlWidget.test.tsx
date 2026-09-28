// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PositionListItem, WidgetPlacement } from '@jurnal-zitn/shared';

import { useDisplayCurrencyQuery } from '@/features/accounting/hooks/useDisplayCurrency';
import { usePositions } from '@/features/positions/hooks/usePositions';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { setAppLocale } from '@/lib/locale';

import RiskControlWidget from './RiskControlWidget';

vi.mock('@/features/accounting/hooks/useDisplayCurrency', () => ({
  useDisplayCurrencyQuery: vi.fn(),
}));
vi.mock('@/hooks/useUserTimezone', () => ({ useUserTimezone: vi.fn() }));
vi.mock('@/features/positions/hooks/usePositions', () => ({ usePositions: vi.fn() }));

function position(over: Partial<PositionListItem>): PositionListItem {
  return {
    id: 'p',
    status: 'closed',
    closedAt: null,
    openedAt: null,
    netPnl: null,
    ...over,
  } as unknown as PositionListItem;
}

function placement(config: Record<string, unknown>): WidgetPlacement {
  return {
    id: 'w1',
    type: 'risk-control',
    x: 0,
    y: 0,
    w: 6,
    h: 6,
    config,
  } as unknown as WidgetPlacement;
}

beforeEach(() => {
  setAppLocale('en');
  vi.mocked(useUserTimezone).mockReturnValue('Asia/Jakarta');
  vi.mocked(useDisplayCurrencyQuery).mockReturnValue({ data: { currency: 'IDR' } } as never);
  vi.mocked(usePositions).mockReturnValue({ data: [], isLoading: false } as never);
});
afterEach(() => {
  setAppLocale('id');
  cleanup();
  vi.clearAllMocks();
});

describe('RiskControlWidget (F3)', () => {
  it('shows loading until the timezone resolves', () => {
    vi.mocked(useUserTimezone).mockReturnValue(undefined);
    const { container } = render(
      <RiskControlWidget
        placement={placement({ dailyLossLimit: '100', maxDailyTrades: 3 })}
        onUpdateConfig={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
  });

  it('is yellow at 80% of the loss limit and green under 75% of the trade limit', () => {
    const today = new Date().toISOString();
    vi.mocked(usePositions).mockReturnValue({
      data: [
        position({ id: 'l', closedAt: today, netPnl: -80 }),
        position({ id: 't1', openedAt: today }),
        position({ id: 't2', openedAt: today }),
      ],
      isLoading: false,
    } as never);

    render(
      <RiskControlWidget
        placement={placement({ dailyLossLimit: '100', maxDailyTrades: 3 })}
        onUpdateConfig={vi.fn()}
      />,
    );
    expect(screen.getByText('Approaching limit')).toBeTruthy();
    expect(screen.getByText('Clear')).toBeTruthy();
  });

  it('is red once the loss limit is reached', () => {
    const today = new Date().toISOString();
    vi.mocked(usePositions).mockReturnValue({
      data: [position({ id: 'l', closedAt: today, netPnl: -80 })],
      isLoading: false,
    } as never);
    render(
      <RiskControlWidget
        placement={placement({ dailyLossLimit: '50', maxDailyTrades: 3 })}
        onUpdateConfig={vi.fn()}
      />,
    );
    expect(screen.getByText('Limit reached')).toBeTruthy();
  });

  it('persists limit edits through onUpdateConfig', () => {
    const onUpdateConfig = vi.fn();
    render(
      <RiskControlWidget
        placement={placement({ dailyLossLimit: '100', maxDailyTrades: 3 })}
        onUpdateConfig={onUpdateConfig}
      />,
    );
    fireEvent.change(screen.getByLabelText('Daily loss limit'), { target: { value: '250' } });
    expect(onUpdateConfig).toHaveBeenCalledWith({ dailyLossLimit: '250', maxDailyTrades: 3 });
  });

  it('shows not-set meters when no limits are configured', () => {
    render(
      <RiskControlWidget
        placement={placement({ dailyLossLimit: '', maxDailyTrades: 0 })}
        onUpdateConfig={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Not set').length).toBeGreaterThanOrEqual(2);
  });
});
