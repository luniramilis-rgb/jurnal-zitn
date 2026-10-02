// @vitest-environment jsdom
//
// Fase F0 widget package (ZITN-TECH-017 §10.3). These tests mount each new
// dashboard widget with its data hooks stubbed, so the registration, the empty
// states and — crucially — the daily-sheet card carrying NO price are exercised
// without a query client or router.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PositionListItem } from '@jurnal-zitn/shared';

import { useDisplayCurrencyQuery } from '@/features/accounting/hooks/useDisplayCurrency';
import { useFeeRollup } from '@/features/expenses/hooks/useFeeRollup';
import { useTaxSummary } from '@/features/expenses/hooks/useTaxSummary';
import { useSheetContext } from '@/features/journal-context/hooks/useSheetContext';
import { usePresetPerformance } from '@/features/performance/hooks/usePresetPerformance';
import { usePositions } from '@/features/positions/hooks/usePositions';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { setAppLocale } from '@/lib/locale';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/features/accounting/hooks/useDisplayCurrency', () => ({
  useDisplayCurrencyQuery: vi.fn(),
}));
vi.mock('@/hooks/useUserTimezone', () => ({ useUserTimezone: vi.fn() }));
vi.mock('@/features/performance/hooks/usePresetPerformance', () => ({
  usePresetPerformance: vi.fn(),
}));
vi.mock('@/features/expenses/hooks/useTaxSummary', () => ({ useTaxSummary: vi.fn() }));
vi.mock('@/features/expenses/hooks/useFeeRollup', () => ({ useFeeRollup: vi.fn() }));
vi.mock('@/features/positions/hooks/usePositions', () => ({ usePositions: vi.fn() }));
vi.mock('@/features/journal-context/hooks/useSheetContext', () => ({ useSheetContext: vi.fn() }));

// Heavy presentational children are stubbed to a marker — the wrapper's own
// gating is what these tests cover.
vi.mock('@/features/performance/components/PnlCalendar', () => ({
  PnlCalendar: () => <div data-testid="pnl-calendar-stub" />,
}));
vi.mock('@/features/performance/components/DimensionBreakdownTable', () => ({
  DimensionBreakdownTable: () => <div data-testid="dimension-breakdown-stub" />,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

import DailySheetWidget from './DailySheetWidget';
import DimensionBreakdownWidget from './DimensionBreakdownWidget';
import IdxTaxFeesWidget from './IdxTaxFeesWidget';
import PnlCalendarWidget from './PnlCalendarWidget';
import RecordCompletenessWidget from './RecordCompletenessWidget';
import { widgetRegistry } from './registry';

let mounted: { container: HTMLElement; root: Root } | null = null;

function mount(ui: React.ReactElement): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { container, root };
  act(() => {
    root.render(ui);
  });
  return container;
}

function perfResult(over: Record<string, unknown> = {}) {
  return {
    query: {
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: { resolvedWeekStartDay: 1 },
    },
    currencyData: { code: 'IDR' },
    range: {
      granularity: 'month',
      start: '2026-09-01T00:00:00.000Z',
      end: '2026-10-01T00:00:00.000Z',
    },
    ...over,
  };
}

function position(over: Partial<PositionListItem>): PositionListItem {
  return {
    id: 'p',
    status: 'open',
    targetPrice: 10,
    stopLoss: 9,
    notes: 'note',
    tags: [],
    ...over,
  } as unknown as PositionListItem;
}

beforeEach(() => {
  setAppLocale('en');
  vi.mocked(useUserTimezone).mockReturnValue('Asia/Jakarta');
  vi.mocked(useDisplayCurrencyQuery).mockReturnValue({ data: { currency: 'IDR' } } as never);
  vi.mocked(usePresetPerformance).mockReturnValue(perfResult() as never);
  vi.mocked(useSheetContext).mockReturnValue({
    data: {
      ok: true,
      tersedia: true,
      tanggal: '2026-09-28',
      asof: '2026-09-28',
      simbol: [],
      level_watch: [],
    },
    isLoading: false,
    refetch: vi.fn(),
  } as never);
  vi.mocked(usePositions).mockReturnValue({ data: [], isLoading: false, isError: false } as never);
  vi.mocked(useTaxSummary).mockReturnValue({
    data: { pphFinal: undefined },
    isLoading: false,
    isError: false,
  } as never);
  vi.mocked(useFeeRollup).mockReturnValue({
    data: { perCurrencyTotals: [], grandTotal: null },
    isLoading: false,
    isError: false,
  } as never);
});

afterEach(() => {
  if (mounted) {
    act(() => mounted!.root.unmount());
    mounted.container.remove();
    mounted = null;
  }
  setAppLocale('id');
  vi.clearAllMocks();
});

describe('F0 widget package', () => {
  it('registers every F0 widget type with a dictionary-backed title', () => {
    const types = widgetRegistry;
    expect(types['pnl-calendar'].displayNameKey).toBe('widget.pnlCalendar');
    expect(types['dimension-breakdown'].displayNameKey).toBe('widget.dimensionBreakdown');
    expect(types['idx-tax-fees'].displayNameKey).toBe('widget.idxTaxFees');
    expect(types['daily-sheet'].displayNameKey).toBe('widget.dailySheet');
    expect(types['record-completeness'].displayNameKey).toBe('widget.recordCompleteness');
  });

  it('P&L calendar: renders the calendar when a currency is resolved', () => {
    const container = mount(<PnlCalendarWidget />);
    expect(container.querySelector('[data-testid="pnl-calendar-stub"]')).not.toBeNull();
  });

  it('P&L calendar: empty state when no display currency is resolved', () => {
    vi.mocked(useDisplayCurrencyQuery).mockReturnValue({ data: { currency: null } } as never);
    vi.mocked(usePresetPerformance).mockReturnValue(perfResult({ currencyData: null }) as never);
    const container = mount(<PnlCalendarWidget />);
    expect(container.textContent).toContain('Close a position in this currency to see your chart.');
  });

  it('dimension breakdown: renders the table when a currency is resolved', () => {
    const container = mount(<DimensionBreakdownWidget />);
    expect(container.querySelector('[data-testid="dimension-breakdown-stub"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="breakdown-dimension-tag"]')).not.toBeNull();
  });

  it('IDX tax & fees: empty state when there is nothing to show', () => {
    const container = mount(<IdxTaxFeesWidget />);
    expect(container.textContent).toContain('No sales or recorded fees this year yet.');
  });

  it('daily sheet: explains an unavailable sheet', () => {
    vi.mocked(useSheetContext).mockReturnValue({
      data: {
        ok: false,
        tersedia: false,
        tanggal: '2026-09-28',
        asof: null,
        simbol: [],
        level_watch: [],
        error: 'tidak_tersedia',
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never);
    const container = mount(<DailySheetWidget />);
    expect(container.textContent).toContain("Couldn't load the daily sheet");
  });

  it('daily sheet: links tickers and the CTA to the chart, carries NO price (D12)', () => {
    vi.mocked(useSheetContext).mockReturnValue({
      data: {
        ok: true,
        tersedia: true,
        tanggal: '2026-09-28',
        asof: '2026-09-28',
        simbol: [
          {
            market: 'ID',
            ticker: 'BBRI',
            chartUrl: 'https://zenitn.test/daily/chart/?tanggal=2026-09-28#BBRI',
          },
        ],
        level_watch: [
          {
            market: 'US',
            ticker: 'AAPL',
            chartUrl: 'https://zenitn.test/daily/chart/?pasar=us#AAPL',
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as never);
    const container = mount(<DailySheetWidget />);
    const text = container.textContent ?? '';
    expect(text).toContain('BBRI');
    expect(text).toContain('AAPL');
    // No price/currency figure of any kind: no "Rp", "$", and no decimal amount.
    expect(text).not.toMatch(/Rp|\$|€|£/);
    expect(text).not.toMatch(/\d+[.,]\d{2}/);

    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    // G4 (D-G3): the sheet surface now lives on ZITN (the journal `/lembar` is gone).
    expect(hrefs).toContain('https://zeninthenoise.com/daily/');
    // G5 (D-G4): each ticker deep-links the ZITN chart (IDX & US) in a new tab.
    const tickerLinks = Array.from(
      container.querySelectorAll('a[data-slot="sheet-context-ticker-link"]'),
    );
    expect(tickerLinks.map((a) => a.getAttribute('href'))).toEqual([
      'https://zeninthenoise.com/daily/chart/?symbol=BBRI&tf=1Y',
      'https://zeninthenoise.com/daily/chart/?symbol=AAPL&tf=1Y&pasar=us',
    ]);
    const cta = container.querySelector('a[data-slot="sheet-context-open-chart"]');
    expect(cta?.getAttribute('href')).toBe(
      'https://zeninthenoise.com/daily/chart/?symbol=BBRI&tf=1Y',
    );
    for (const link of [...tickerLinks, cta]) {
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('record completeness: empty state when every process count is zero', () => {
    const container = mount(<RecordCompletenessWidget />);
    expect(container.textContent).toContain('Your process notes are complete.');
  });

  it('record completeness: counts open-without-plan and closed-without-tag/notes', () => {
    vi.mocked(usePositions).mockImplementation(((filters?: { status?: string }) => {
      if (filters?.status === 'open') {
        return {
          data: [
            position({ id: 'o1', targetPrice: null, stopLoss: null }),
            position({ id: 'o2', targetPrice: 10, stopLoss: 9 }),
          ],
          isLoading: false,
          isError: false,
        };
      }
      return {
        data: [
          position({ id: 'c1', status: 'closed', tags: [], notes: '' }),
          position({
            id: 'c2',
            status: 'closed',
            tags: [{ id: 't', name: 'x', category: 'setup', color: null }],
            notes: 'ok',
          }),
        ],
        isLoading: false,
        isError: false,
      };
    }) as never);
    const container = mount(<RecordCompletenessWidget />);
    const text = container.textContent ?? '';
    // One open-without-plan, one closed-without-tag, one closed-without-notes.
    expect(text).toContain('Open positions without target/stop');
    expect(text).toContain('Closed trades without a tag');
    expect(text).toContain('Closed trades without notes');
    expect(text).toContain('1');
  });
});
