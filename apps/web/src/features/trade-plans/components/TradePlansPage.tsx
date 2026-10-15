import { Fragment, useState } from 'react';
import { toast } from 'sonner';

import type {
  MessageKey,
  TradePlan,
  TradePlanChecklist,
  TradePlanDecision,
  TradePlanStatus,
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
import { useT } from '@/hooks/useLocale';
import { PRA_TRADE_CHECKLIST_ENABLED } from '@/lib/frontendFlags';

import {
  useCreateTradePlan,
  useDeleteTradePlan,
  useSetTradePlanDecision,
  useTradePlans,
  useUpdateTradePlan,
} from '../hooks/useTradePlans';

import { PlanChecklistSection } from './PlanChecklistSection';

const EMPTY = {
  symbol: '',
  side: 'long' as 'long' | 'short',
  entryPrice: '',
  stopLoss: '',
  targetPrice: '',
  note: '',
  signalDate: '',
};

const STATUS_LABEL: Record<TradePlanStatus, MessageKey> = {
  draft: 'tp.stDraft',
  closed: 'tp.stClosed',
};

const DECISION_LABEL: Record<TradePlanDecision, MessageKey> = {
  taken: 'tp.decTaken',
  skipped: 'tp.decSkipped',
  no_action: 'tp.decNoAction',
};

/** Live reward:risk from the plan's own levels; null when it cannot be computed. */
export function liveRR(plan: {
  side: 'long' | 'short';
  entryPrice: string | null;
  stopLoss: string | null;
  targetPrice: string | null;
}): number | null {
  if (plan.entryPrice == null || plan.stopLoss == null || plan.targetPrice == null) return null;
  if (
    plan.entryPrice.trim() === '' ||
    plan.stopLoss.trim() === '' ||
    plan.targetPrice.trim() === ''
  )
    return null;
  const entry = Number(plan.entryPrice);
  const stop = Number(plan.stopLoss);
  const target = Number(plan.targetPrice);
  if (![entry, stop, target].every((n) => Number.isFinite(n))) return null;
  const risk = plan.side === 'long' ? entry - stop : stop - entry;
  const reward = plan.side === 'long' ? target - entry : entry - target;
  if (risk <= 0 || reward <= 0) return null;
  return Math.round((reward / risk) * 100) / 100;
}

/**
 * TradePlansPage — F4 (ZITN-TECH-017 §10.8). ZITN-TECH-070 Fase 1: RPT stands
 * alone (no position link), one entry price, one note, with the forward-only
 * lifecycle Pending → Executed / Missed / Cancelled.
 */
export function TradePlansPage() {
  const t = useT();
  const list = useTradePlans();
  const create = useCreateTradePlan();
  const setDecision = useSetTradePlanDecision();
  const remove = useDeleteTradePlan();
  const update = useUpdateTradePlan();
  // Recording a decision closes the plan (§3b); a confirmation guards a mis-click.
  const [confirm, setConfirm] = useState<{ plan: TradePlan; decision: TradePlanDecision } | null>(
    null,
  );
  // Saved risk profile (Cek Risiko → Profil risiko): surfaced here so the
  // pre-trade draft is written against the same setting (ZITN-TECH-043 §3.3).
  const { choice: riskProfile } = useRiskProfile();
  const { data: riskProfileData } = useRiskProfileData(riskProfile.market);
  const [form, setForm] = useState(EMPTY);
  // The plan whose levels are being edited inline, or null. Carries the plan id
  // alongside a form copy so Save can PATCH the right row.
  const [editing, setEditing] = useState<
    | (typeof EMPTY & {
        id: string;
        market: string;
        checklist: TradePlanChecklist | null;
      })
    | null
  >(null);
  // The row whose pre-trade checklist is expanded inline. Shown on demand so it
  // is always reachable from the table (the "Ubah" card sits above the list and
  // is easy to miss) — ZITN-TECH-069 Lapis 2 visibility fix.
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        ...(form.entryPrice ? { entryPrice: form.entryPrice } : {}),
        ...(form.stopLoss ? { stopLoss: form.stopLoss } : {}),
        ...(form.targetPrice ? { targetPrice: form.targetPrice } : {}),
        ...(form.note ? { note: form.note } : {}),
        ...(form.signalDate ? { signalDate: form.signalDate } : {}),
      },
      { onSuccess: () => setForm(EMPTY) },
    );
  };

  const openEdit = (plan: TradePlan) =>
    setEditing({
      id: plan.id,
      market: plan.market,
      checklist: plan.checklist,
      symbol: plan.symbol,
      side: plan.side,
      entryPrice: plan.entryPrice ?? '',
      stopLoss: plan.stopLoss ?? '',
      targetPrice: plan.targetPrice ?? '',
      note: plan.note ?? '',
      signalDate: plan.signalDate ?? '',
    });

  const saveEdit = () => {
    if (!editing) return;
    // Omit blank fields: the update schema rejects an empty decimal string.
    update.mutate(
      {
        id: editing.id,
        data: {
          ...(editing.entryPrice ? { entryPrice: editing.entryPrice } : {}),
          ...(editing.stopLoss ? { stopLoss: editing.stopLoss } : {}),
          ...(editing.targetPrice ? { targetPrice: editing.targetPrice } : {}),
          ...(editing.note ? { note: editing.note } : {}),
          ...(editing.signalDate ? { signalDate: editing.signalDate } : {}),
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

  const input = (
    key: keyof typeof EMPTY,
    label: string,
    type: 'text' | 'number' | 'date' = 'text',
  ) => (
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

  const editField = (
    key: keyof typeof EMPTY,
    label: string,
    type: 'text' | 'number' | 'date' = 'text',
  ) => (
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

  const decisionButton = (plan: TradePlan, decision: TradePlanDecision, label: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="cursor-pointer"
      disabled={setDecision.isPending}
      onClick={() => setConfirm({ plan, decision })}
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
            {input('entryPrice', t('tp.entry'), 'number')}
            {input('stopLoss', t('tp.stop'), 'number')}
            {input('targetPrice', t('tp.target'), 'number')}
            {input('signalDate', t('tp.signalDate'), 'date')}
          </div>
          {input('note', t('tp.note'))}
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
              {editField('entryPrice', t('tp.entry'), 'number')}
              {editField('stopLoss', t('tp.stop'), 'number')}
              {editField('targetPrice', t('tp.target'), 'number')}
              {editField('signalDate', t('tp.signalDate'), 'date')}
            </div>
            {editField('note', t('tp.note'))}
            {PRA_TRADE_CHECKLIST_ENABLED && (
              <div className="border-t pt-3">
                <PlanChecklistSection
                  planId={editing.id}
                  symbol={editing.symbol}
                  market={editing.market}
                  signalDate={editing.signalDate || null}
                  value={editing.checklist}
                  onSaved={(c) => setEditing((prev) => (prev ? { ...prev, checklist: c } : prev))}
                />
              </div>
            )}
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
            <TableHead>{t('tp.entry')}</TableHead>
            <TableHead>{t('tp.stop')}</TableHead>
            <TableHead>{t('tp.target')}</TableHead>
            <TableHead>{t('tp.rr')}</TableHead>
            <TableHead>{t('tp.status')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground">
                {t('tp.empty')}
              </TableCell>
            </TableRow>
          )}
          {list.data?.items.map((plan) => (
            <Fragment key={plan.id}>
              <TableRow
                data-testid="trade-plan-row"
                className={plan.id === focusId ? 'ring-2 ring-primary' : undefined}
              >
                <TableCell className="font-medium">
                  {plan.symbol}
                  {(plan.market !== 'id' || plan.signalDate || plan.rule) && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {plan.market === 'us' ? 'S&P 500' : 'IDX'}
                      {plan.rule ? ` · ${plan.rule}` : ''}
                      {plan.signalDate ? ` · ${plan.signalDate}` : ''}
                    </span>
                  )}
                </TableCell>
                <TableCell>{plan.side === 'long' ? t('tp.sideLong') : t('tp.sideShort')}</TableCell>
                <TableCell>
                  <Numeric value={plan.entryPrice} kind="decimal" direction="none" />
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
                <TableCell>
                  {t(STATUS_LABEL[plan.status])}
                  {plan.decision ? ` · ${t(DECISION_LABEL[plan.decision])}` : ''}
                </TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  {PRA_TRADE_CHECKLIST_ENABLED && (
                    <Button
                      type="button"
                      variant={expandedId === plan.id ? 'default' : 'outline'}
                      size="sm"
                      className="cursor-pointer"
                      aria-expanded={expandedId === plan.id}
                      data-testid="tp-checklist-toggle"
                      onClick={() => setExpandedId((prev) => (prev === plan.id ? null : plan.id))}
                    >
                      {t('tp.checklist')}
                    </Button>
                  )}
                  {plan.status === 'draft' && (
                    <>
                      {decisionButton(plan, 'taken', t('tp.decTaken'))}
                      {decisionButton(plan, 'skipped', t('tp.decSkipped'))}
                      {decisionButton(plan, 'no_action', t('tp.decNoAction'))}
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
              {PRA_TRADE_CHECKLIST_ENABLED && expandedId === plan.id && (
                <TableRow data-testid="trade-plan-detail">
                  <TableCell colSpan={8} className="bg-muted/30">
                    <PlanChecklistSection
                      planId={plan.id}
                      symbol={plan.symbol}
                      market={plan.market}
                      signalDate={plan.signalDate}
                      value={plan.checklist}
                      onSaved={() => undefined}
                    />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
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
                    status: t(DECISION_LABEL[confirm.decision]),
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
                if (confirm)
                  setDecision.mutate({ id: confirm.plan.id, decision: confirm.decision });
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
