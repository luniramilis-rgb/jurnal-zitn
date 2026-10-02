import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSheetContext } from '@/features/journal-context/hooks/useSheetContext';
import { useT } from '@/hooks/useLocale';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { ZITN_DAILY_URL, zitnChartUrl } from '@/lib/zitn';

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
 * READ-ONLY snippet — date, watch/symbol tickers — and by contract (D12, pagar
 * doktrin) it **carries no price**: nothing here renders OHLCV or any market
 * figure. It counts and lists tickers; each ticker opens the ZITN chart in a new
 * tab, one CTA opens the first chart, and the sheet CTA leaves for ZITN
 * (`/lembar` was removed in Fase G, D-G3).
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
  const entries = [...symbols, ...watch];
  const hasAny = entries.length > 0;
  const firstEntry = entries[0];

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
          {entries.map((entry, index) => (
            <li key={`${entry.market}:${entry.ticker}:${index}`} className="text-sm">
              <a
                href={zitnChartUrl(entry.ticker, entry.market?.toLowerCase() === 'us')}
                target="_blank"
                rel="noopener noreferrer"
                data-slot="sheet-context-ticker-link"
                aria-label={`${entry.ticker} — ${t('journal.context.openChart')}`}
                title={t('journal.context.openChart')}
                className="font-medium underline underline-offset-2"
              >
                {entry.ticker}
              </a>{' '}
              <span className="text-muted-foreground">{entry.market}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t('journal.context.none')}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1">
        {firstEntry && (
          <a
            href={zitnChartUrl(firstEntry.ticker, firstEntry.market?.toLowerCase() === 'us')}
            target="_blank"
            rel="noopener noreferrer"
            data-slot="sheet-context-open-chart"
            className="text-sm font-medium underline underline-offset-2"
          >
            {t('journal.context.openChart')}
          </a>
        )}
        <a
          href={ZITN_DAILY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer text-sm font-medium hover:underline"
        >
          {t('w.sheet.open')}
        </a>
      </div>
    </div>
  );
}

export default DailySheetWidget;
