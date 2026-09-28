import type { PerformanceQueryInput } from '@jurnal-zitn/shared';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDisplayCurrencyQuery } from '@/features/accounting/hooks/useDisplayCurrency';
import { PnlCalendar } from '@/features/performance/components/PnlCalendar';
import { usePresetPerformance } from '@/features/performance/hooks/usePresetPerformance';
import { useT } from '@/hooks/useLocale';
import { useUserTimezone } from '@/hooks/useUserTimezone';

/** The `YYYY-MM` of "now" in `tz`, or UTC if the zone is unusable. */
function currentMonthInTz(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    if (year && month) return `${year}-${month}`;
  } catch {
    // fall through to UTC
  }
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * PnlCalendarWidget — Fase F0 (ZITN-TECH-017 §10.3). Wraps the performance
 * page's `PnlCalendar` for the dashboard. It resolves the reporting timezone,
 * display currency and the server's resolved week-start day, then hands the
 * calendar a day-granularity window; the calendar issues its own request.
 *
 * The data it renders is the user's own realised P&L, so it belongs on the
 * authenticated dashboard (K11) and nowhere public.
 */
function PnlCalendarWidget() {
  const t = useT();
  const timezone = useUserTimezone();
  const { data: displayCurrencyData } = useDisplayCurrencyQuery();
  const displayCurrency = displayCurrencyData?.currency ?? null;

  const { query, currencyData, range } = usePresetPerformance({
    preset: 'all-time',
    timezone,
    currency: displayCurrency,
    granularity: 'month',
  });

  if (timezone === undefined || query.isLoading || range === null) {
    return <Skeleton className="h-full w-full" />;
  }

  if (query.isError) {
    return (
      <EmptyState
        title={t('w.perf.errorTitle')}
        action={
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              void query.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  if (currencyData == null) {
    return <EmptyState title={t('w.perf.empty')} />;
  }

  const params: PerformanceQueryInput = {
    granularity: 'month',
    start: range.start,
    end: range.end,
    tz: timezone,
    currency: currencyData.code,
  };

  return (
    <PnlCalendar
      params={params}
      month={currentMonthInTz(timezone)}
      resolvedWeekStartDay={query.data?.resolvedWeekStartDay ?? 1}
      timezone={timezone}
    />
  );
}

export default PnlCalendarWidget;
