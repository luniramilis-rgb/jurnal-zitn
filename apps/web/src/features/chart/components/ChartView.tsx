import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { SymbolAutocomplete } from '@/components/SymbolAutocomplete';
import { Label } from '@/components/ui/label';
import { parseContext } from '@/features/workspace/context';
import { useT } from '@/hooks/useLocale';

import { isChartRange, toCandlePoints, type ChartRange } from '../candles';
import { useCandles } from '../hooks/useCandles';
import { loadLwc, type LwcChart } from '../lwc';

/**
 * ChartView — Fase 3c (ZITN-TECH-029). Chart internal jurnal: membaca konteks dari URL
 * (`symbol`, `tf`, `pasar`/`market`) dan deret OHLCV dari jembatan (`/api/journal/candles`),
 * lalu menggambar candlestick dengan Lightweight Charts yang di-vendor.
 *
 * Jurnal menggambar chart-nya sendiri (D-4(a)/(b)); tetap READ-ONLY terhadap data ZITN.
 */
export function ChartView() {
  const t = useT();
  const navigate = useNavigate();
  const { searchStr } = useLocation();
  const params = new URLSearchParams(searchStr);
  const ctx = parseContext(searchStr);
  const market = params.get('market') === 'us' || params.get('pasar') === 'us' ? 'us' : 'id';
  const range: ChartRange = isChartRange(ctx.tf) ? ctx.tf : '1Y';
  const symbol = ctx.symbol;

  const query = useCandles(market, symbol);
  const data = query.data;
  const points = useMemo(() => (data && data.ok ? toCandlePoints(data, range) : []), [data, range]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol || points.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    let chart: LwcChart | null = null;
    let cancelled = false;
    setChartError(null);

    loadLwc()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        chart = api.createChart(containerRef.current, {
          height: 420,
          layout: { background: { color: 'transparent' }, textColor: '#9aa3af' },
          grid: {
            vertLines: { color: 'rgba(39,44,54,0.6)' },
            horzLines: { color: 'rgba(39,44,54,0.6)' },
          },
          rightPriceScale: { borderColor: '#272c36' },
          timeScale: { borderColor: '#272c36' },
        });
        const series = chart.addSeries(api.CandlestickSeries, {});
        series.setData(points);
        chart.timeScale().fitContent();
      })
      .catch(() => {
        if (!cancelled) setChartError(t('chart.failed'));
      });

    return () => {
      cancelled = true;
      if (chart) chart.remove();
    };
  }, [symbol, points, t]);

  if (!symbol) {
    return (
      <section className="space-y-3" data-testid="chart-empty">
        <h1 className="text-lg font-semibold">{t('chart.title')}</h1>
        <p className="text-muted-foreground text-sm">{t('chart.noSymbol')}</p>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="chart-symbol">{t('journal.context.colTicker')}</Label>
          <SymbolAutocomplete
            id="chart-symbol"
            value=""
            placeholder={t('calc.field.symbolPlaceholder')}
            onChange={(ticker) =>
              void navigate({
                to: '/chart',
                search: {
                  symbol: ticker,
                  tf: range,
                  ...(market === 'us' ? { pasar: 'us' } : {}),
                },
              })
            }
          />
        </div>
      </section>
    );
  }

  const message = !data
    ? t('chart.loading')
    : data.error === 'paywall'
      ? t('journal.context.paywall')
      : data.error === 'belum_tertaut'
        ? t('chart.notLinked')
        : data.error === 'konteks_nonaktif'
          ? t('chart.off')
          : t('chart.unavailable');
  const paywall = data?.error === 'paywall';
  const renewHref = `/api/auth/sso/start?redirect=${encodeURIComponent(
    typeof window === 'undefined' ? '/chart' : window.location.pathname + window.location.search,
  )}`;
  const unavailable = query.isLoading ? false : !data?.ok || points.length === 0;

  return (
    <section className="space-y-3" data-testid="chart-view">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">
          {symbol} <span className="text-muted-foreground text-sm uppercase">{market}</span>
        </h1>
        {data?.name && <p className="text-muted-foreground text-sm">{data.name}</p>}
      </header>

      {unavailable ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm" role="status">
            {message}
          </p>
          {paywall && (
            <a
              href={renewHref}
              className="inline-flex h-9 cursor-pointer items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              {t('journal.context.renew')}
            </a>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          data-testid="chart-canvas"
          className="h-[420px] w-full rounded-md border"
        />
      )}

      {chartError && (
        <p className="text-destructive text-sm" role="alert">
          {chartError}
        </p>
      )}

      <p className="text-muted-foreground text-xs">{t('chart.footnote')}</p>
    </section>
  );
}

export default ChartView;
