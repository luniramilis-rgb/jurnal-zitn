import { useEffect } from 'react';

import type { MessageKey, WidgetPlacement } from '@jurnal-zitn/shared';
import { riskControlLevel, type RiskControlLevel } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Skeleton } from '@/components/ui/skeleton';
import { useDisplayCurrencyQuery } from '@/features/accounting/hooks/useDisplayCurrency';
import { usePositions } from '@/features/positions/hooks/usePositions';
import { useT } from '@/hooks/useLocale';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { cn } from '@/lib/utils';

import { widgetRegistry } from './registry';

export interface RiskControlWidgetProps {
  placement: WidgetPlacement;
  onUpdateConfig: (config: Record<string, unknown>) => void;
}

interface RiskControlConfig {
  dailyLossLimit: string;
  maxDailyTrades: number;
}

// Static class literals (Tailwind must see them).
const LEVEL_BAR: Record<RiskControlLevel, string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
  'not-set': 'bg-muted',
};

const LEVEL_LABEL: Record<RiskControlLevel, MessageKey> = {
  green: 'w.risk.green',
  yellow: 'w.risk.yellow',
  red: 'w.risk.red',
  'not-set': 'w.risk.notSet',
};

const LEVEL_TEXT: Record<RiskControlLevel, string> = {
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-destructive',
  'not-set': 'text-muted-foreground',
};

function dayKeyInTz(at: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

function Meter({
  label,
  used,
  limit,
  currency,
  kind,
}: {
  label: string;
  used: number;
  limit: number | null;
  currency: string;
  kind: 'money' | 'integer';
}) {
  const reading = riskControlLevel(used, limit);
  const t = useT();
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">
          <Numeric value={used} kind={kind} currency={currency} direction="none" />
          {limit !== null && (
            <>
              <span className="text-muted-foreground"> / </span>
              <Numeric value={limit} kind={kind} currency={currency} direction="none" />
            </>
          )}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-muted">
        <div
          className={cn('h-full rounded', LEVEL_BAR[reading.level])}
          style={{ width: `${(reading.ratio ?? 0) * 100}%` }}
        />
      </div>
      <span className={cn('text-xs', LEVEL_TEXT[reading.level])}>
        {t(LEVEL_LABEL[reading.level])}
      </span>
    </div>
  );
}

/**
 * RiskControlWidget — Fase F3 (ZITN-TECH-017 §10.7). The daily risk-control
 * meter: realised loss today and trades entered today, each measured against a
 * user-set limit with the 75% yellow threshold. Green below 75%, yellow at/above,
 * red at the limit.
 *
 * The limits are stored in THIS widget's config (no migration / preferences
 * endpoint). "Today" is the reporting zone's calendar day (WIB by default).
 * Trades entered today uses the stored open instant, which is the server's
 * "now" for manual opens — a documented approximation.
 */
function RiskControlWidget({ placement, onUpdateConfig }: RiskControlWidgetProps) {
  const t = useT();
  const timezone = useUserTimezone();
  const { data: displayCurrencyData } = useDisplayCurrencyQuery();
  const currency = displayCurrencyData?.currency ?? 'USD';
  const positions = usePositions();

  const def = widgetRegistry['risk-control'];
  const parsed = def.configSchema?.safeParse(placement.config ?? {});
  const parseFailed = parsed !== undefined && !parsed.success;
  const config: RiskControlConfig =
    parsed && parsed.success
      ? (parsed.data as RiskControlConfig)
      : (def.defaultConfig as RiskControlConfig);

  useEffect(() => {
    if (parseFailed) onUpdateConfig(def.defaultConfig as Record<string, unknown>);
  }, [parseFailed, onUpdateConfig, def.defaultConfig]);

  if (timezone === undefined || positions.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  const today = dayKeyInTz(new Date(), timezone);
  const list = positions.data ?? [];
  const closedToday = list.filter(
    (p) => p.closedAt != null && dayKeyInTz(new Date(p.closedAt), timezone) === today,
  );
  const lossToday = closedToday.reduce(
    (sum, p) => (p.netPnl != null && p.netPnl < 0 ? sum - p.netPnl : sum),
    0,
  );
  const entriesToday = list.filter(
    (p) => p.openedAt != null && dayKeyInTz(new Date(p.openedAt), timezone) === today,
  ).length;

  const lossLimit = Number(config.dailyLossLimit) > 0 ? Number(config.dailyLossLimit) : null;
  const tradeLimit = config.maxDailyTrades > 0 ? config.maxDailyTrades : null;

  const update = (patch: Partial<RiskControlConfig>) => {
    onUpdateConfig({ ...config, ...patch });
  };

  return (
    <div className="flex h-full flex-col gap-4 text-sm">
      <Meter
        label={t('w.risk.lossToday')}
        used={lossToday}
        limit={lossLimit}
        currency={currency}
        kind="money"
      />
      <Meter
        label={t('w.risk.enteredToday')}
        used={entriesToday}
        limit={tradeLimit}
        currency={currency}
        kind="integer"
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t('w.risk.dailyLoss')}</span>
          <input
            type="number"
            inputMode="decimal"
            aria-label={t('w.risk.dailyLoss')}
            value={config.dailyLossLimit}
            onChange={(event) => update({ dailyLossLimit: event.target.value })}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{t('w.risk.maxTrades')}</span>
          <input
            type="number"
            inputMode="numeric"
            aria-label={t('w.risk.maxTrades')}
            value={config.maxDailyTrades > 0 ? String(config.maxDailyTrades) : ''}
            onChange={(event) =>
              update({ maxDailyTrades: Math.max(0, Math.trunc(Number(event.target.value) || 0)) })
            }
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
      </div>

      <p className="mt-auto text-xs text-muted-foreground">{t('w.risk.note')}</p>
    </div>
  );
}

export default RiskControlWidget;
