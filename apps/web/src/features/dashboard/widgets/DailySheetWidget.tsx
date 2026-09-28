import { Link } from '@tanstack/react-router';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSheetContext } from '@/features/journal-context/hooks/useSheetContext';
import { useT } from '@/hooks/useLocale';
import { useUserTimezone } from '@/hooks/useUserTimezone';

/** Today's `YYYY-MM-DD` in `tz`, or UTC if the zone is unusable. */
function todayInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * DailySheetWidget — Fase F0 (ZITN-TECH-017 §10.3, kartu "Lembar hari ini").
 *
 * Reads the ZITN daily-sheet context through `useSheetContext`. The context is a
 * READ-ONLY snippet — date, watch/symbol tickers and an optional link to the
 * chart — and by contract (D12, pagar doktrin) it **carries no price**: nothing
 * here renders OHLCV or any market figure. The widget only counts and lists
 * tickers, then links to `/lembar`.
 */
function DailySheetWidget() {
  const t = useT();
  const timezone = useUserTimezone();
  const tanggal = timezone === undefined ? null : todayInTz(timezone);
  const query = useSheetContext(tanggal);
  const context = query.data;

  if (timezone === undefined || query.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  if (!context || !context.ok) {
    const message =
      context?.error === 'belum_tertaut'
        ? t('journal.context.notLinked')
        : context?.error === 'konteks_nonaktif'
          ? t('journal.context.off')
          : t('w.sheet.empty');

    return (
      <EmptyState
        title={t('w.sheet.errorTitle')}
        description={message}
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

  const symbols = context.simbol;
  const watch = context.level_watch;
  const hasAny = symbols.length > 0 || watch.length > 0;

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-medium">{context.tanggal ?? tanggal}</span>
        <span className="text-muted-foreground">
          {t('w.sheet.symbolCount', { n: symbols.length })}
        </span>
        <span className="text-muted-foreground">
          {t('w.sheet.watchCount', { n: watch.length })}
        </span>
      </div>

      {hasAny ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1" data-slot="sheet-context-entries">
          {[...symbols, ...watch].map((entry, index) => (
            <li key={`${entry.market}:${entry.ticker}:${index}`} className="text-sm">
              <span className="font-medium">{entry.ticker}</span>{' '}
              <span className="text-muted-foreground">{entry.market}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t('journal.context.none')}</p>
      )}

      <div className="mt-auto">
        <Link to="/lembar" className="cursor-pointer text-sm font-medium hover:underline">
          {t('w.sheet.open')}
        </Link>
      </div>
    </div>
  );
}

export default DailySheetWidget;
