import { useState } from 'react';

import type { MessageKey, TradePlan, TradePlanStatus } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePositions } from '@/features/positions/hooks/usePositions';
import { useT } from '@/hooks/useLocale';

import {
  useCreateTradePlan,
  useDeleteTradePlan,
  useLinkTradePlan,
  useSetTradePlanStatus,
  useTradePlans,
} from '../hooks/useTradePlans';

const EMPTY = {
  symbol: '',
  side: 'long' as 'long' | 'short',
  thesis: '',
  entryZoneLow: '',
  stopLoss: '',
  targetPrice: '',
};

const STATUS_LABEL: Record<TradePlanStatus, MessageKey> = {
  pending: 'tp.stPending',
  executed: 'tp.stExecuted',
  missed: 'tp.stMissed',
  cancelled: 'tp.stCancelled',
};

/** Live reward:risk from the plan's own levels; null when it cannot be computed. */
export function liveRR(plan: {
  side: 'long' | 'short';
  entryZoneLow: string | null;
  entryZoneHigh: string | null;
  stopLoss: string | null;
  targetPrice: string | null;
}): number | null {
  const rawEntry = plan.entryZoneHigh ?? plan.entryZoneLow;
  if (rawEntry == null || plan.stopLoss == null || plan.targetPrice == null) return null;
  if (rawEntry.trim() === '' || plan.stopLoss.trim() === '' || plan.targetPrice.trim() === '')
    return null;
  const entry = Number(rawEntry);
  const stop = Number(plan.stopLoss);
  const target = Number(plan.targetPrice);
  if (![entry, stop, target].every((n) => Number.isFinite(n))) return null;
  const risk = plan.side === 'long' ? entry - stop : stop - entry;
  const reward = plan.side === 'long' ? target - entry : entry - target;
  if (risk <= 0 || reward <= 0) return null;
  return Math.round((reward / risk) * 100) / 100;
}

/**
 * TradePlansPage — F4 (ZITN-TECH-017 §10.8). Pre-trade plans with a live R:R and
 * the forward-only lifecycle Pending → Executed / Missed / Cancelled.
 */
export function TradePlansPage() {
  const t = useT();
  const list = useTradePlans();
  const create = useCreateTradePlan();
  const setStatus = useSetTradePlanStatus();
  const remove = useDeleteTradePlan();
  const linkPlan = useLinkTradePlan();
  const positions = usePositions();
  const positionById = new Map((positions.data ?? []).map((p) => [p.id, p]));
  const [form, setForm] = useState(EMPTY);

  const submit = () => {
    if (form.symbol.trim() === '') return;
    create.mutate(
      {
        symbol: form.symbol.trim().toUpperCase(),
        side: form.side,
        ...(form.thesis ? { thesis: form.thesis } : {}),
        ...(form.entryZoneLow ? { entryZoneLow: form.entryZoneLow } : {}),
        ...(form.stopLoss ? { stopLoss: form.stopLoss } : {}),
        ...(form.targetPrice ? { targetPrice: form.targetPrice } : {}),
      },
      { onSuccess: () => setForm(EMPTY) },
    );
  };

  const input = (key: keyof typeof EMPTY, label: string, type: 'text' | 'number' = 'text') => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
        className="rounded-md border bg-background px-2 py-1 text-sm"
      />
    </label>
  );

  const statusButton = (plan: TradePlan, status: TradePlanStatus, label: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="cursor-pointer"
      disabled={setStatus.isPending}
      onClick={() => setStatus.mutate({ id: plan.id, status })}
    >
      {label}
    </Button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('tp.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('tp.new')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {input('symbol', t('tp.symbol'))}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{t('tp.side')}</span>
              <select
                value={form.side}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, side: event.target.value as 'long' | 'short' }))
                }
                className="cursor-pointer rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="long">{t('tp.sideLong')}</option>
                <option value="short">{t('tp.sideShort')}</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {input('entryZoneLow', t('tp.entryLow'), 'number')}
            {input('stopLoss', t('tp.stop'), 'number')}
            {input('targetPrice', t('tp.target'), 'number')}
          </div>
          {input('thesis', t('tp.thesis'))}
          <Button
            type="button"
            className="cursor-pointer"
            disabled={create.isPending}
            onClick={submit}
          >
            {t('tp.add')}
          </Button>
        </CardContent>
      </Card>

      {list.isError && <p className="text-sm text-destructive">{t('tp.failed')}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('tp.symbol')}</TableHead>
            <TableHead>{t('tp.side')}</TableHead>
            <TableHead>{t('tp.entryLow')}</TableHead>
            <TableHead>{t('tp.stop')}</TableHead>
            <TableHead>{t('tp.target')}</TableHead>
            <TableHead>{t('tp.rr')}</TableHead>
            <TableHead>{t('tp.status')}</TableHead>
            <TableHead>{t('tp.link')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-muted-foreground">
                {t('tp.empty')}
              </TableCell>
            </TableRow>
          )}
          {list.data?.items.map((plan) => (
            <TableRow key={plan.id} data-testid="trade-plan-row">
              <TableCell className="font-medium">{plan.symbol}</TableCell>
              <TableCell>{plan.side === 'long' ? t('tp.sideLong') : t('tp.sideShort')}</TableCell>
              <TableCell>
                <Numeric value={plan.entryZoneLow} kind="decimal" direction="none" />
              </TableCell>
              <TableCell>
                <Numeric value={plan.stopLoss} kind="decimal" direction="none" />
              </TableCell>
              <TableCell>
                <Numeric value={plan.targetPrice} kind="decimal" direction="none" />
              </TableCell>
              <TableCell>
                <Numeric value={liveRR(plan)} kind="decimal" direction="none" />
              </TableCell>
              <TableCell>{t(STATUS_LABEL[plan.status])}</TableCell>
              <TableCell>
                {plan.positionId ? (
                  <span className="flex items-center gap-2">
                    <span>
                      {positionById.get(plan.positionId)?.symbol ?? plan.positionId.slice(0, 8)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      disabled={linkPlan.isPending}
                      onClick={() => linkPlan.mutate({ id: plan.id, positionId: null })}
                    >
                      {t('tp.unlink')}
                    </Button>
                  </span>
                ) : (
                  <select
                    aria-label={t('tp.link')}
                    value=""
                    disabled={linkPlan.isPending}
                    onChange={(event) => {
                      if (event.target.value) {
                        linkPlan.mutate({ id: plan.id, positionId: event.target.value });
                      }
                    }}
                    className="cursor-pointer rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">{t('tp.linkNone')}</option>
                    {(positions.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.symbol}
                      </option>
                    ))}
                  </select>
                )}
              </TableCell>
              <TableCell className="space-x-2 whitespace-nowrap">
                {plan.status === 'pending' && (
                  <>
                    {statusButton(plan, 'executed', t('tp.execute'))}
                    {statusButton(plan, 'missed', t('tp.miss'))}
                    {statusButton(plan, 'cancelled', t('tp.cancel'))}
                  </>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => remove.mutate(plan.id)}
                >
                  {t('tp.delete')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default TradePlansPage;
