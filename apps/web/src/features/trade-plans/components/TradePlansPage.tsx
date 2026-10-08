import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import type {
  MessageKey,
  TradePlan,
  TradePlanStatus,
  UpdatePositionInput,
} from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { useRiskProfile } from '@/features/cek-risiko/hooks/useRiskProfile';
import { useRiskProfileData } from '@/features/cek-risiko/hooks/useRiskProfileData';
import { usePositions } from '@/features/positions/hooks/usePositions';
import { useT } from '@/hooks/useLocale';
import { api } from '@/lib/api';

import {
  useCreateTradePlan,
  useDeleteTradePlan,
  useLinkTradePlan,
  useSetTradePlanStatus,
  useTradePlans,
  useUpdateTradePlan,
} from '../hooks/useTradePlans';

const EMPTY = {
  symbol: '',
  side: 'long' as 'long' | 'short',
  thesis: '',
  entryZoneLow: '',
  entryZoneHigh: '',
  stopLoss: '',
  targetPrice: '',
};

const STATUS_LABEL: Record<TradePlanStatus, MessageKey> = {
  pending: 'tp.stPending',
  executed: 'tp.stExecuted',
  missed: 'tp.stMissed',
  cancelled: 'tp.stCancelled',
};

const POSITION_STATUS_LABEL: Record<'draft' | 'open' | 'closed', MessageKey> = {
  draft: 'pos.status.draft',
  open: 'pos.status.open',
  closed: 'pos.status.closed',
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
 * Positions a plan may link to: the SAME symbol only, and never one another plan
 * already owns (the link is 1:1). Pure, so the honesty of the dropdown is tested.
 */
export function linkablePositions<T extends { id: string; symbol: string }>(
  plan: { symbol: string },
  positions: readonly T[],
  plans: readonly { positionId: string | null }[],
): readonly T[] {
  const linked = new Set(
    plans.map((p) => p.positionId).filter((pid): pid is string => pid != null),
  );
  return positions.filter((p) => p.symbol === plan.symbol && !linked.has(p.id));
}

/**
 * Levels a position inherits when a plan is linked to it (F4 correction): the
 * plan's stop/target, but ONLY where the position has none — a value the trader
 * already typed is never overwritten. Pure, so the copy rule is tested.
 */
export function planLevelsPatch(
  plan: { stopLoss: string | null; targetPrice: string | null },
  position: { stopLoss: number | null; targetPrice: number | null } | undefined,
): Pick<UpdatePositionInput, 'stopLoss' | 'targetPrice'> {
  if (!position) return {};
  const patch: Pick<UpdatePositionInput, 'stopLoss' | 'targetPrice'> = {};
  if (position.stopLoss == null && plan.stopLoss) patch.stopLoss = plan.stopLoss;
  if (position.targetPrice == null && plan.targetPrice) patch.targetPrice = plan.targetPrice;
  return patch;
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
  const update = useUpdateTradePlan();
  const queryClient = useQueryClient();
  // Linking copies the plan's levels onto the position (F4 correction) — see
  // planLevelsPatch for the "never overwrite" rule.
  const applyPlanLevels = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePositionInput }) =>
      api.put(`/positions/${id}`, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['positions'] }),
  });
  // Show every position by default (a plan may attach to a closed/draft trade
  // too, and the linked one must resolve to its symbol). "Open only" narrows it.
  const [openOnly, setOpenOnly] = useState(false);
  const positions = usePositions(openOnly ? { status: 'open' } : undefined);
  // The lifecycle is forward-only (F4): a confirmation step guards a mis-click
  // without relaxing the rule.
  const [confirm, setConfirm] = useState<{ plan: TradePlan; status: TradePlanStatus } | null>(null);
  // Saved risk profile (Cek Risiko → Profil risiko): surfaced here so the
  // pre-trade draft is written against the same setting (ZITN-TECH-043 §3.3).
  const { choice: riskProfile } = useRiskProfile();
  const { data: riskProfileData } = useRiskProfileData(riskProfile.market);
  const positionById = new Map((positions.data ?? []).map((p) => [p.id, p]));
  const [form, setForm] = useState(EMPTY);
  // The plan whose levels are being edited inline, or null. Carries the plan id
  // alongside a form copy so Save can PATCH the right row.
  const [editing, setEditing] = useState<(typeof EMPTY & { id: string }) | null>(null);
  // "Tambah ke Jurnal" dari Pemindai ZITN (ZITN-TECH-043): SSO mengarahkan ke
  // `/trade-plans?focus=<id>`; sorot draf yang baru dibuat/difokuskan.
  const focusId =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('focus') : null;

  const submit = () => {
    if (form.symbol.trim() === '') return;
    create.mutate(
      {
        symbol: form.symbol.trim().toUpperCase(),
        side: form.side,
        ...(form.thesis ? { thesis: form.thesis } : {}),
        ...(form.entryZoneLow ? { entryZoneLow: form.entryZoneLow } : {}),
        ...(form.entryZoneHigh ? { entryZoneHigh: form.entryZoneHigh } : {}),
        ...(form.stopLoss ? { stopLoss: form.stopLoss } : {}),
        ...(form.targetPrice ? { targetPrice: form.targetPrice } : {}),
      },
      { onSuccess: () => setForm(EMPTY) },
    );
  };

  const openEdit = (plan: TradePlan) =>
    setEditing({
      id: plan.id,
      symbol: plan.symbol,
      side: plan.side,
      thesis: plan.thesis ?? '',
      entryZoneLow: plan.entryZoneLow ?? '',
      entryZoneHigh: plan.entryZoneHigh ?? '',
      stopLoss: plan.stopLoss ?? '',
      targetPrice: plan.targetPrice ?? '',
    });

  const saveEdit = () => {
    if (!editing) return;
    // Omit blank fields: the update schema rejects an empty decimal string.
    update.mutate(
      {
        id: editing.id,
        data: {
          ...(editing.thesis ? { thesis: editing.thesis } : {}),
          ...(editing.entryZoneLow ? { entryZoneLow: editing.entryZoneLow } : {}),
          ...(editing.entryZoneHigh ? { entryZoneHigh: editing.entryZoneHigh } : {}),
          ...(editing.stopLoss ? { stopLoss: editing.stopLoss } : {}),
          ...(editing.targetPrice ? { targetPrice: editing.targetPrice } : {}),
        },
      },
      {
        onSuccess: () => {
          setEditing(null);
          toast.success(t('tp.updated'));
        },
      },
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

  const editField = (key: keyof typeof EMPTY, label: string, type: 'text' | 'number' = 'text') => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type={type}
        value={editing?.[key] ?? ''}
        onChange={(event) =>
          setEditing((prev) => (prev ? { ...prev, [key]: event.target.value } : prev))
        }
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
      onClick={() => setConfirm({ plan, status })}
    >
      {label}
    </Button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('tp.title')}</h1>

      <p className="text-sm text-muted-foreground" data-testid="tp-risk-profile">
        {t('cek.profile.current')}:{' '}
        {riskProfileData?.rules[riskProfile.rule]?.label ?? riskProfile.rule} ·{' '}
        {t(`cek.profile.period.${riskProfile.period}`)} · TP {riskProfile.tp}% ·{' '}
        {riskProfile.sl === 'none' ? t('cek.profile.noSl') : `SL ${riskProfile.sl}%`} · H{' '}
        {riskProfile.h}{' '}
        <a href="/cek-risiko" className="underline">
          {t('cek.profile.title')}
        </a>
      </p>

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
          <div className="grid gap-3 sm:grid-cols-4">
            {input('entryZoneLow', t('tp.entryLow'), 'number')}
            {input('entryZoneHigh', t('tp.entryHigh'), 'number')}
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

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('tp.editTitle')} · {editing.symbol}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              {editField('entryZoneLow', t('tp.entryLow'), 'number')}
              {editField('entryZoneHigh', t('tp.entryHigh'), 'number')}
              {editField('stopLoss', t('tp.stop'), 'number')}
              {editField('targetPrice', t('tp.target'), 'number')}
            </div>
            {editField('thesis', t('tp.thesis'))}
            <div className="flex gap-2">
              <Button
                type="button"
                className="cursor-pointer"
                disabled={update.isPending}
                onClick={saveEdit}
              >
                {t('tp.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setEditing(null)}
              >
                {t('action.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {list.isError && <p className="text-sm text-destructive">{t('tp.failed')}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('tp.symbol')}</TableHead>
            <TableHead>{t('tp.side')}</TableHead>
            <TableHead>{t('tp.entryLow')}</TableHead>
            <TableHead>{t('tp.entryHigh')}</TableHead>
            <TableHead>{t('tp.stop')}</TableHead>
            <TableHead>{t('tp.target')}</TableHead>
            <TableHead>{t('tp.rr')}</TableHead>
            <TableHead>{t('tp.status')}</TableHead>
            <TableHead>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span>{t('tp.link')}</span>
                  <label className="flex cursor-pointer items-center gap-1 text-xs font-normal text-muted-foreground">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={openOnly}
                      onChange={(event) => setOpenOnly(event.target.checked)}
                    />
                    {t('tp.linkOpenOnly')}
                  </label>
                </div>
                <span className="text-xs font-normal text-muted-foreground">
                  {t('tp.linkHint')}
                </span>
              </div>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-muted-foreground">
                {t('tp.empty')}
              </TableCell>
            </TableRow>
          )}
          {list.data?.items.map((plan) => (
            <TableRow
              key={plan.id}
              data-testid="trade-plan-row"
              className={plan.id === focusId ? 'ring-2 ring-primary' : undefined}
            >
              <TableCell className="font-medium">
                {plan.symbol}
                {(plan.market !== 'id' || plan.signalDate) && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {plan.market === 'us' ? 'S&P 500' : 'IDX'}
                    {plan.signalDate ? ` · ${plan.signalDate}` : ''}
                  </span>
                )}
              </TableCell>
              <TableCell>{plan.side === 'long' ? t('tp.sideLong') : t('tp.sideShort')}</TableCell>
              <TableCell>
                <Numeric value={plan.entryZoneLow} kind="decimal" direction="none" />
              </TableCell>
              <TableCell>
                <Numeric value={plan.entryZoneHigh} kind="decimal" direction="none" />
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
                    <a href={`/positions/${plan.positionId}`} className="hover:underline">
                      {positionById.get(plan.positionId)?.symbol ?? plan.positionId.slice(0, 8)}
                    </a>
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
                      const positionId = event.target.value;
                      if (positionId) {
                        linkPlan.mutate(
                          { id: plan.id, positionId },
                          {
                            // Carry the plan's levels onto the position so the
                            // Posisi tab shows them without re-typing (never
                            // overwriting a value already there).
                            onSuccess: () => {
                              const patch = planLevelsPatch(plan, positionById.get(positionId));
                              if (Object.keys(patch).length > 0) {
                                applyPlanLevels.mutate({ id: positionId, data: patch });
                              }
                            },
                            onError: () => toast.error(t('tp.linkErrGeneric')),
                          },
                        );
                      }
                    }}
                    className="cursor-pointer rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">{t('tp.linkNone')}</option>
                    {linkablePositions(plan, positions.data ?? [], list.data?.items ?? []).map(
                      (p) => (
                        <option key={p.id} value={p.id}>
                          {p.symbol} · {p.side === 'long' ? t('tp.sideLong') : t('tp.sideShort')}
                          {p.openedAt ? ` · ${p.openedAt.slice(0, 10)}` : ''} ·{' '}
                          {t(POSITION_STATUS_LABEL[p.status])}
                        </option>
                      ),
                    )}
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
                  onClick={() => openEdit(plan)}
                >
                  {t('tp.edit')}
                </Button>
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

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tp.confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm
                ? t('tp.confirm.body', {
                    symbol: confirm.plan.symbol,
                    status: t(STATUS_LABEL[confirm.status]),
                  })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" onClick={() => setConfirm(null)}>
              {t('action.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                if (confirm) setStatus.mutate({ id: confirm.plan.id, status: confirm.status });
                setConfirm(null);
              }}
            >
              {t('tp.confirm.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TradePlansPage;
