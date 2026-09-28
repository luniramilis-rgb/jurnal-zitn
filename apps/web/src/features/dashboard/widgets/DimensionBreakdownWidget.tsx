import { useState } from 'react';

import type { BreakdownDimension, MessageKey } from '@jurnal-zitn/shared';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDisplayCurrencyQuery } from '@/features/accounting/hooks/useDisplayCurrency';
import { DimensionBreakdownTable } from '@/features/performance/components/DimensionBreakdownTable';
import { usePresetPerformance } from '@/features/performance/hooks/usePresetPerformance';
import { useT } from '@/hooks/useLocale';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { cn } from '@/lib/utils';

/** The dimensions this widget exposes (per-symbol / per-tag, §10.3). */
const DIMENSIONS: { value: BreakdownDimension; key: MessageKey }[] = [
  { value: 'symbol', key: 'w.breakdown.symbol' },
  { value: 'tag', key: 'w.breakdown.tag' },
];

/**
 * DimensionBreakdownWidget — Fase F0 (ZITN-TECH-017 §10.3). Reuses
 * `DimensionBreakdownTable` (which reads `breakdown.service` through
 * `useBreakdown`) over the user's all-time window and display currency, with a
 * small local selector for symbol vs tag. The table owns its own loading,
 * empty and error states, so the widget only gates on the window.
 */
function DimensionBreakdownWidget() {
  const t = useT();
  const timezone = useUserTimezone();
  const { data: displayCurrencyData } = useDisplayCurrencyQuery();
  const displayCurrency = displayCurrencyData?.currency ?? null;
  const [by, setBy] = useState<BreakdownDimension>('symbol');

  const { query, currencyData, range } = usePresetPerformance({
    preset: 'all-time',
    timezone,
    currency: displayCurrency,
    granularity: 'month',
  });

  if (timezone === undefined || query.isLoading || range === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        title={t('w.breakdown.errorTitle')}
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
    return <EmptyState title={t('w.breakdown.empty')} />;
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        role="tablist"
        aria-label={t('w.breakdown.dimension')}
        className="inline-flex items-center gap-1 self-start rounded-lg bg-muted p-1"
      >
        {DIMENSIONS.map((dimension) => {
          const active = dimension.value === by;
          return (
            <button
              key={dimension.value}
              type="button"
              role="tab"
              aria-selected={active}
              data-state={active ? 'active' : 'inactive'}
              data-testid={`breakdown-dimension-${dimension.value}`}
              onClick={() => setBy(dimension.value)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(dimension.key)}
            </button>
          );
        })}
      </div>
      <DimensionBreakdownTable
        by={by}
        params={{ start: range.start, end: range.end, tz: timezone }}
        currency={currencyData.code}
      />
    </div>
  );
}

export default DimensionBreakdownWidget;
