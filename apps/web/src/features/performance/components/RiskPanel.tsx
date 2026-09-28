import type { ReactNode } from 'react';

import type { RiskStats } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useT } from '@/hooks/useLocale';

export interface RiskPanelProps {
  risk: RiskStats | undefined;
  /** ISO 4217 code used to format money fields. */
  currency: string;
}

/** Label for one R histogram bin, e.g. `< -2R`, `-2R … -1R`, `≥ 2R`. */
function binLabel(min: number | null, max: number | null): string {
  if (min === null && max !== null) return `< ${max}R`;
  if (max === null && min !== null) return `≥ ${min}R`;
  return `${min}R … ${max}R`;
}

/**
 * RiskPanel — Fase F1 (ZITN-TECH-017 §10.5). Surfaces the pure risk analytics
 * computed server-side from the same populations as the rest of the page:
 * Sharpe/Sortino/Calmar (annualised by granularity), max drawdown and its
 * duration, R-multiple statistics ("average loss = 1R") and the rolling
 * 20-trade win rate, plus R per symbol.
 *
 * This is the user's OWN result data on the authenticated performance page
 * (K11); it is never rendered on a public or sales surface.
 */
export function RiskPanel({ risk, currency }: RiskPanelProps) {
  const t = useT();
  if (!risk) return null;

  const rows: { label: string; render: ReactNode }[] = [
    { label: t('perf.risk.sharpe'), render: <Numeric value={risk.sharpe} kind="decimal" /> },
    { label: t('perf.risk.sortino'), render: <Numeric value={risk.sortino} kind="decimal" /> },
    { label: t('perf.risk.calmar'), render: <Numeric value={risk.calmar} kind="decimal" /> },
    {
      label: t('perf.risk.maxDrawdown'),
      render: (
        <Numeric value={risk.maxDrawdown} kind="money" currency={currency} direction="none" />
      ),
    },
    {
      label: t('perf.risk.maxDrawdownPct'),
      render: <Numeric value={risk.maxDrawdownPct} kind="percent" direction="none" />,
    },
    {
      label: t('perf.risk.drawdownPeriods'),
      render: <Numeric value={risk.drawdownPeriods} kind="integer" direction="none" />,
    },
    { label: t('perf.risk.avgR'), render: <Numeric value={risk.avgR} kind="decimal" /> },
    {
      label: t('perf.risk.expectancyR'),
      render: <Numeric value={risk.expectancyR} kind="decimal" />,
    },
    {
      label: t('perf.risk.rolling', { window: risk.rollingWindow }),
      render: <Numeric value={risk.rollingWinRate} kind="percent" direction="none" />,
    },
  ];

  const hasAnyRatio =
    risk.sharpe !== null ||
    risk.sortino !== null ||
    risk.calmar !== null ||
    risk.avgR !== null ||
    risk.bySymbol.length > 0;

  return (
    <Card data-testid="risk-panel">
      <CardHeader>
        <CardTitle>{t('perf.risk.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasAnyRatio ? (
          <p className="text-sm text-muted-foreground">{t('perf.risk.none')}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {rows.map((row) => (
                <div key={row.label} className="flex flex-col">
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium" data-testid={`risk-${row.label}`}>
                    {row.render}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">{t('perf.risk.annualised')}</p>
          </>
        )}

        {risk.rHistogram.length > 0 &&
          (() => {
            const maxCount = Math.max(1, ...risk.rHistogram.map((bin) => bin.count));
            return (
              <div>
                <h3 className="mb-2 text-sm font-medium">{t('perf.risk.histogram')}</h3>
                <ul className="space-y-1" data-testid="risk-histogram">
                  {risk.rHistogram.map((bin) => (
                    <li
                      key={`${bin.min ?? 'neg'}:${bin.max ?? 'pos'}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-24 shrink-0 text-muted-foreground">
                        {binLabel(bin.min, bin.max)}
                      </span>
                      <span
                        className="h-2 rounded bg-secondary"
                        style={{ width: `${(bin.count / maxCount) * 100}%` }}
                      />
                      <span className="text-muted-foreground">
                        <Numeric value={bin.count} kind="integer" direction="none" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

        {risk.bySymbol.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">{t('perf.risk.bySymbol')}</h3>
            <Table data-testid="risk-by-symbol">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('perf.risk.colSymbol')}</TableHead>
                  <TableHead>{t('perf.risk.colTrades')}</TableHead>
                  <TableHead>{t('perf.risk.colAvgR')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risk.bySymbol.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.key}</TableCell>
                    <TableCell>
                      <Numeric value={row.trades} kind="integer" direction="none" />
                    </TableCell>
                    <TableCell>
                      <Numeric value={row.avgR} kind="decimal" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RiskPanel;
