import { useState } from 'react';

import type { BehaviorStats } from '@jurnal-zitn/shared';
import { halfKellyFraction, kellyFraction, riskOfRuin } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/hooks/useLocale';

export interface BehaviorPanelProps {
  behavior: BehaviorStats | undefined;
}

function parseNum(value: string): number {
  if (value.trim() === '') return Number.NaN;
  return Number(value);
}

/**
 * BehaviorPanel — Fase F3 (ZITN-TECH-017 §10.7). Surfaces the entry-time
 * behaviour analytics (overtrading days, revenge entries, a process discipline
 * score) and a self-contained risk-of-ruin / Kelly calculator.
 *
 * Everything here is a PROCESS metric or a pure computation — no outcome claim.
 * The thresholds it shows (mean + 1.5σ; a 30-minute revenge window; the
 * discipline weights) are documented and exported in `lib/behavior.ts`.
 */
export function BehaviorPanel({ behavior }: BehaviorPanelProps) {
  const t = useT();
  const [winRate, setWinRate] = useState('60');
  const [payoff, setPayoff] = useState('2');
  const [ruinUnits, setRuinUnits] = useState('10');

  if (!behavior) return null;

  const kelly = kellyFraction(parseNum(winRate), parseNum(payoff));
  const halfKelly = halfKellyFraction(parseNum(winRate), parseNum(payoff));
  const ruin = riskOfRuin(parseNum(winRate), parseNum(ruinUnits));

  const hasTrades = behavior.discipline.score !== null;

  return (
    <Card data-testid="behavior-panel">
      <CardHeader>
        <CardTitle>{t('perf.behavior.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasTrades ? (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <div className="flex flex-col">
                <dt className="text-sm text-muted-foreground">{t('perf.behavior.discipline')}</dt>
                <dd className="text-lg font-semibold" data-testid="behavior-score">
                  <Numeric value={behavior.discipline.score} kind="decimal" direction="none" />
                </dd>
              </div>
              {(
                [
                  ['perf.behavior.tagged', behavior.discipline.taggedRate],
                  ['perf.behavior.noRevenge', behavior.discipline.noRevengeRate],
                  ['perf.behavior.noOvertrading', behavior.discipline.noOvertradingRate],
                ] as const
              ).map(([label, rate]) => (
                <div key={label} className="flex flex-col">
                  <dt className="text-sm text-muted-foreground">{t(label)}</dt>
                  <dd className="font-medium">
                    <Numeric value={rate * 100} kind="percent" direction="none" />
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <dl className="space-y-1 text-sm">
                <h3 className="mb-1 text-sm font-medium">{t('perf.behavior.overtrading')}</h3>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t('perf.behavior.activeDays')}</dt>
                  <dd>
                    <Numeric
                      value={behavior.overtrading.activeDays}
                      kind="integer"
                      direction="none"
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t('perf.behavior.overDays')}</dt>
                  <dd>
                    <Numeric
                      value={behavior.overtrading.overDayCount}
                      kind="integer"
                      direction="none"
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t('perf.behavior.threshold')}</dt>
                  <dd>
                    <Numeric
                      value={behavior.overtrading.threshold}
                      kind="decimal"
                      direction="none"
                    />
                  </dd>
                </div>
              </dl>

              <dl className="space-y-1 text-sm">
                <h3 className="mb-1 text-sm font-medium">{t('perf.behavior.revenge')}</h3>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t('perf.behavior.revengeWindow')}</dt>
                  <dd>{t('perf.behavior.minutes', { n: behavior.revenge.windowMinutes })}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t('perf.behavior.revengeCount')}</dt>
                  <dd>
                    <Numeric
                      value={behavior.revenge.revengeCount}
                      kind="integer"
                      direction="none"
                    />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t('perf.behavior.revengeRate')}</dt>
                  <dd>
                    <Numeric
                      value={behavior.revenge.revengeRate * 100}
                      kind="percent"
                      direction="none"
                    />
                  </dd>
                </div>
              </dl>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('perf.behavior.empty')}</p>
        )}

        <div className="border-t pt-4">
          <h3 className="mb-2 text-sm font-medium">{t('perf.behavior.calc.title')}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['perf.behavior.calc.winRate', winRate, setWinRate],
                ['perf.behavior.calc.payoff', payoff, setPayoff],
                ['perf.behavior.calc.ruinUnits', ruinUnits, setRuinUnits],
              ] as const
            ).map(([label, value, setValue]) => (
              <label key={label} className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">{t(label)}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-x-6 text-sm">
            <div className="flex flex-col">
              <dt className="text-muted-foreground">{t('perf.behavior.calc.kelly')}</dt>
              <dd className="font-medium" data-testid="calc-kelly">
                <Numeric
                  value={kelly === null ? null : kelly * 100}
                  kind="percent"
                  direction="none"
                />
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-muted-foreground">{t('perf.behavior.calc.halfKelly')}</dt>
              <dd className="font-medium" data-testid="calc-half-kelly">
                <Numeric
                  value={halfKelly === null ? null : halfKelly * 100}
                  kind="percent"
                  direction="none"
                />
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-muted-foreground">{t('perf.behavior.calc.ruin')}</dt>
              <dd className="font-medium" data-testid="calc-ruin">
                <Numeric value={ruin} kind="percent" direction="none" />
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-xs text-muted-foreground">{t('perf.behavior.note')}</p>
      </CardContent>
    </Card>
  );
}

export default BehaviorPanel;
