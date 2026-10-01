// Konteks lembar harian ZITN (ZITN-TECH-019). Jurnal hanya MEMBACA: tanpa iframe, tanpa render
// ulang lembar, tanpa salinan `signals_*.csv`. Sejak ZITN-TECH-029 Fase 3b (D-4(a)/(b)) jembatan
// juga mengirim **baris lembar ber-harga** untuk workspace berbayar, dirender sebagai tabel di sini.

import { Numeric } from '@/components/Numeric';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useT } from '@/hooks/useLocale';

import { useSheetContext, type SheetContextEntry } from '../hooks/useSheetContext';

function Entries({ entries }: { entries: SheetContextEntry[] }) {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1" data-slot="sheet-context-entries">
      {entries.map((entry) => (
        <li key={`${entry.market}:${entry.ticker}`} className="text-sm">
          <span className="font-medium">{entry.ticker}</span>{' '}
          <span className="text-muted-foreground">{entry.market}</span>
          {/* Opsi B: jurnal tidak menggambar chart; simbol IDX & US menautkan ke chart Lembar
              Harian (permukaan ZITN, entitlement sama). Tab baru agar jurnal tetap terbuka.
              Tanpa iframe, tanpa harga di sini. */}
          {entry.chartUrl && (
            <>
              {' '}
              <a
                href={entry.chartUrl}
                target="_blank"
                rel="noopener"
                aria-label={t('journal.context.openChart')}
                title={t('journal.context.openChart')}
                className="underline underline-offset-2"
              >
                {t('journal.context.chart')}
              </a>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DailySheetContext({ tanggal }: { tanggal: string | null }) {
  const t = useT();
  const query = useSheetContext(tanggal);
  const context = query.data;

  if (query.isLoading) {
    return (
      <p className="text-muted-foreground text-sm" data-slot="sheet-context-loading">
        {t('journal.context.loading')}
      </p>
    );
  }

  if (!context || !context.ok) {
    const paywall = context?.error === 'paywall';
    const message = paywall
      ? t('journal.context.paywall')
      : context?.error === 'belum_tertaut'
        ? t('journal.context.notLinked')
        : context?.error === 'konteks_nonaktif'
          ? t('journal.context.off')
          : t('journal.context.unavailable');
    const renewHref = `/api/auth/sso/start?redirect=${encodeURIComponent(
      window.location.pathname + window.location.search,
    )}`;

    return (
      <section className="space-y-3" data-slot="sheet-context-unavailable">
        <h1 className="text-lg font-semibold">{t('journal.context.title')}</h1>
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
        {paywall ? (
          <a
            href={renewHref}
            className="inline-flex h-9 cursor-pointer items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
          >
            {t('journal.context.renew')}
          </a>
        ) : (
          <Button variant="outline" className="cursor-pointer" onClick={() => void query.refetch()}>
            {t('journal.context.refresh')}
          </Button>
        )}
      </section>
    );
  }

  // Defensif: respons lama (atau fixture) mungkin belum membawa `rows`.
  const rows = context.rows ?? [];

  return (
    <section className="space-y-4" data-slot="sheet-context">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{t('journal.context.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('journal.context.subtitle')}</p>
      </header>

      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">{t('journal.context.date')}</dt>
          <dd className="font-medium">{context.tanggal ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('journal.context.asof')}</dt>
          <dd className="font-medium">{context.asof ?? '—'}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">{t('journal.context.symbols')}</h2>
        {context.simbol.length ? (
          <Entries entries={context.simbol} />
        ) : (
          <p className="text-muted-foreground text-sm">{t('journal.context.none')}</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">{t('journal.context.watch')}</h2>
        {context.level_watch.length ? (
          <Entries entries={context.level_watch} />
        ) : (
          <p className="text-muted-foreground text-sm">{t('journal.context.none')}</p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">{t('journal.context.rows')}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('journal.context.colTicker')}</TableHead>
                <TableHead>{t('journal.context.colKind')}</TableHead>
                <TableHead>{t('journal.context.colEntry')}</TableHead>
                <TableHead>{t('journal.context.colTarget')}</TableHead>
                <TableHead>{t('journal.context.colStop')}</TableHead>
                <TableHead>{t('journal.context.colDistance')}</TableHead>
                <TableHead>{t('journal.context.colStatus')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.market}:${row.ticker}`} data-testid="sheet-row">
                  <TableCell className="font-medium">{row.ticker}</TableCell>
                  <TableCell>{row.kind ?? '—'}</TableCell>
                  <TableCell>
                    <Numeric value={row.entry} kind="decimal" direction="none" />
                  </TableCell>
                  <TableCell>
                    <Numeric value={row.target} kind="decimal" direction="none" />
                  </TableCell>
                  <TableCell>
                    <Numeric value={row.stop} kind="decimal" direction="none" />
                  </TableCell>
                  <TableCell>
                    <Numeric value={row.distance_pct} kind="percent" direction="none" />
                  </TableCell>
                  <TableCell>{row.data_status ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
