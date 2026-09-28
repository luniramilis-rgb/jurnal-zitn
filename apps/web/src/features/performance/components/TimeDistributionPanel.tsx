import type { Granularity, SeriesBucket, TimeDistribution } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

export interface TimeDistributionPanelProps {
  time: TimeDistribution | undefined;
  /** The already-loaded bucket series, used for the per-period P&L distribution. */
  series: SeriesBucket[];
  granularity: Granularity;
  currency: string;
  /** Reporting zone the entry hours are expressed in (WIB by default). */
  timezone: string;
}

// Static class literals so Tailwind's scanner emits them (a computed
// `bg-${sign}/${level}` would not be seen).
const HEAT = {
  gain: ['bg-gain/15', 'bg-gain/30', 'bg-gain/50'],
  loss: ['bg-loss/15', 'bg-loss/30', 'bg-loss/50'],
} as const;

function heatClass(netPnl: number, maxAbs: number): string {
  if (netPnl === 0) return 'bg-muted';
  const sign = netPnl > 0 ? 'gain' : 'loss';
  const ratio = maxAbs === 0 ? 0 : Math.abs(netPnl) / maxAbs;
  const level = ratio > 0.66 ? 2 : ratio > 0.33 ? 1 : 0;
  return HEAT[sign][level];
}

interface Bin {
  min: number;
  max: number;
  count: number;
}

/** Equal-width histogram over the bucket P&L; at most `maxBins` columns. */
function buildHistogram(values: number[], maxBins = 9): Bin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ min, max, count: values.length }];
  const binCount = Math.max(1, Math.min(maxBins, values.length));
  const width = (max - min) / binCount;
  const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
    min: min + i * width,
    max: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    bins[idx]!.count += 1;
  }
  return bins;
}

/**
 * TimeDistributionPanel — Fase F2 (ZITN-TECH-017 §10.6). Entry-time analysis:
 * P&L and win rate per entry weekday, an entry-hour heatmap (colour by sign,
 * intensity by magnitude), and the distribution of per-period P&L to read
 * consistency against spikes. The hours/days are the reporting zone's wall
 * clock (WIB by default for IDX users).
 *
 * The user's own result data on the authenticated performance page (K11).
 */
export function TimeDistributionPanel({
  time,
  series,
  granularity,
  currency,
  timezone,
}: TimeDistributionPanelProps) {
  const t = useT();
  if (!time) return null;

  const entered = time.weekday.some((row) => row.trades > 0);
  const maxAbsHour = Math.max(0, ...time.hour.map((row) => Number(row.netPnl)));

  const periodValues = series.map((b) => Number(b.netPnl));
  const histogram = buildHistogram(periodValues);
  const maxBin = Math.max(1, ...histogram.map((b) => b.count));
  const nonZero = periodValues.filter((v) => v !== 0);
  const positive = periodValues.filter((v) => v > 0).length;

  return (
    <Card data-testid="time-distribution-panel">
      <CardHeader>
        <CardTitle>{t('perf.time.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!entered ? (
          <p className="text-sm text-muted-foreground">{t('perf.time.empty')}</p>
        ) : (
          <>
            <div>
              <h3 className="mb-2 text-sm font-medium">{t('perf.time.weekday')}</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {time.weekday.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-2 text-sm">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="flex items-center gap-2">
                      <Numeric
                        value={row.netPnl}
                        kind="money"
                        currency={currency}
                        direction="auto"
                      />
                      <Numeric value={row.winRate} kind="percent" direction="none" />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">{t('perf.time.hour')}</h3>
              <ul
                className="grid grid-cols-6 gap-1 sm:grid-cols-12"
                data-testid="time-hour-heatmap"
              >
                {time.hour.map((row) => (
                  <li
                    key={row.key}
                    title={`${row.label}: ${row.netPnl}`}
                    className={cn(
                      'flex flex-col items-center rounded px-1 py-1 text-xs',
                      heatClass(Number(row.netPnl), maxAbsHour),
                    )}
                  >
                    <span className="text-muted-foreground">{row.label.slice(0, 2)}</span>
                    <span className="font-medium">
                      <Numeric
                        value={row.netPnl}
                        kind="money"
                        currency={currency}
                        direction="auto"
                        precision={0}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {histogram.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">
              {t('perf.time.distribution')} · {granularity}
            </h3>
            <ul className="space-y-1" data-testid="time-pnl-distribution">
              {histogram.map((bin) => (
                <li key={`${bin.min}:${bin.max}`} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 text-muted-foreground">
                    <Numeric
                      value={bin.min}
                      kind="money"
                      currency={currency}
                      direction="none"
                      precision={0}
                    />
                    {' … '}
                    <Numeric
                      value={bin.max}
                      kind="money"
                      currency={currency}
                      direction="none"
                      precision={0}
                    />
                  </span>
                  <span
                    className="h-2 rounded bg-secondary"
                    style={{ width: `${(bin.count / maxBin) * 100}%` }}
                  />
                  <span className="text-muted-foreground">
                    <Numeric value={bin.count} kind="integer" direction="none" />
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t('perf.time.periods')}</dt>
                <dd className="font-medium">
                  <Numeric value={periodValues.length} kind="integer" direction="none" />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t('perf.time.positive')}</dt>
                <dd className="font-medium">
                  <Numeric
                    value={
                      periodValues.length === 0 ? null : (positive / periodValues.length) * 100
                    }
                    kind="percent"
                    direction="none"
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t('perf.time.best')}</dt>
                <dd className="font-medium">
                  <Numeric
                    value={nonZero.length === 0 ? null : Math.max(...nonZero)}
                    kind="money"
                    currency={currency}
                    direction="auto"
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t('perf.time.worst')}</dt>
                <dd className="font-medium">
                  <Numeric
                    value={nonZero.length === 0 ? null : Math.min(...nonZero)}
                    kind="money"
                    currency={currency}
                    direction="auto"
                  />
                </dd>
              </div>
            </dl>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{t('perf.time.note', { tz: timezone })}</p>
      </CardContent>
    </Card>
  );
}

export default TimeDistributionPanel;
