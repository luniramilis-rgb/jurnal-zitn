import type { ReactNode } from 'react';

import { Numeric } from '@/components/Numeric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

import { useRiskProfile } from '../hooks/useRiskProfile';
import {
  RISK_H_OPTIONS,
  RISK_PERIODS,
  RISK_PRESETS,
  RISK_PROFILE,
  RISK_RULES,
  RISK_SL_OPTIONS,
  RISK_TP_OPTIONS,
  lookupRiskProfile,
  type RiskProfileCell,
} from '../lib/risk-profile';

function PctMag({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) return <span>—</span>;
  return (
    <>
      <Numeric value={value * 100} kind="decimal" precision={2} direction="none" />%
    </>
  );
}

function PctSigned({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) return <span>—</span>;
  return (
    <>
      <Numeric value={value * 100} kind="decimal" precision={2} direction="auto" />%
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}

/** Bar proporsi TP / timeout / SL. */
function OutcomeBar({ cell }: { cell: RiskProfileCell }) {
  const t = useT();
  const pTp = cell.p_tp;
  const pSl = cell.p_sl ?? 0;
  const pTimeout = Math.max(0, 1 - pTp - pSl);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  return (
    <div className="space-y-1" data-testid="cek-profile-bar">
      <div className="flex h-3 w-full overflow-hidden rounded bg-muted leading-none">
        <div className="bg-gain/70" style={{ width: pct(pTp) }} title={t('cek.profile.bar.tp')} />
        <div
          className="bg-muted-foreground/30"
          style={{ width: pct(pTimeout) }}
          title={t('cek.profile.bar.timeout')}
        />
        <div className="bg-loss/70" style={{ width: pct(pSl) }} title={t('cek.profile.bar.sl')} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {t('cek.profile.bar.tp')} <PctMag value={pTp} />
        </span>
        <span>
          {t('cek.profile.bar.timeout')} <PctMag value={pTimeout} />
        </span>
        <span>
          {t('cek.profile.bar.sl')} <PctMag value={cell.p_sl} />
        </span>
      </div>
    </div>
  );
}

/** Gauge P(TP) vs impas. */
function BreakevenGauge({ cell }: { cell: RiskProfileCell }) {
  const t = useT();
  if (cell.breakeven === null) return null;
  const pTp = cell.p_tp;
  const safeMax = Math.max(pTp, cell.breakeven, 0.5) * 1.1;
  const width = (v: number) => `${Math.min(100, (v / safeMax) * 100)}%`;
  const fragile = pTp < cell.breakeven;
  return (
    <div className="space-y-1" data-testid="cek-profile-gauge">
      <p className="text-xs text-muted-foreground">{t('cek.profile.gauge.win')}</p>
      <div className="relative h-3 w-full overflow-hidden rounded bg-muted">
        <div
          className={cn('h-full', fragile ? 'bg-warning' : 'bg-gain')}
          style={{ width: width(pTp) }}
        />
        <div
          className="absolute top-0 h-full border-l-2 border-foreground"
          style={{ left: width(cell.breakeven) }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          P(TP) <PctMag value={pTp} />
        </span>
        <span>
          {t('cek.profile.breakeven')} <PctMag value={cell.breakeven} />
        </span>
      </div>
    </div>
  );
}

/** Segmen "Profil risiko" (ZITN-TECH-043) di dalam tab Cek Risiko. */
export function ProfilRisikoPanel() {
  const t = useT();
  const { choice, setChoice } = useRiskProfile();
  const { cell, approx, used } = lookupRiskProfile(choice);

  const patch = (next: Partial<typeof choice>) => setChoice({ ...choice, ...next });
  const applyPreset = (preset: (typeof RISK_PRESETS)[number]) =>
    setChoice({ ...choice, tp: preset.tp, sl: preset.sl });

  const fragile = cell !== null && cell.breakeven !== null && cell.p_tp < cell.breakeven;
  const deepTail = cell !== null && (cell.p_loss40 > 0 || (cell.min ?? 0) <= -0.4);

  return (
    <div className="space-y-4" data-testid="cek-profile">
      {/* "Risiko saat ini": setelan yang sedang aktif. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('cek.profile.current')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p data-testid="cek-profile-current">
            {RISK_PROFILE.rules[choice.rule]?.label ?? choice.rule} ·{' '}
            {t(`cek.profile.period.${choice.period}`)} · TP {choice.tp}% ·{' '}
            {choice.sl === 'none' ? t('cek.profile.noSl') : `SL ${choice.sl}%`} · H {choice.h}
          </p>
          <p className="text-xs text-muted-foreground">{t('cek.profile.saveHint')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cek-profile-rule">{t('cek.profile.rule')}</Label>
              <select
                id="cek-profile-rule"
                data-testid="cek-profile-rule"
                value={choice.rule}
                onChange={(e) => patch({ rule: e.target.value as typeof choice.rule })}
                className="cursor-pointer rounded-md border bg-background px-2 py-1 text-sm"
              >
                {RISK_RULES.map((rule) => (
                  <option key={rule} value={rule}>
                    {RISK_PROFILE.rules[rule]?.label ?? rule}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cek-profile-period">{t('cek.profile.period')}</Label>
              <select
                id="cek-profile-period"
                data-testid="cek-profile-period"
                value={choice.period}
                onChange={(e) => patch({ period: e.target.value as typeof choice.period })}
                className="cursor-pointer rounded-md border bg-background px-2 py-1 text-sm"
              >
                {RISK_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {t(`cek.profile.period.${period}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('cek.profile.preset')}</Label>
            <div className="flex flex-wrap gap-2">
              {RISK_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant={
                    choice.tp === preset.tp && choice.sl === preset.sl ? 'default' : 'outline'
                  }
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => applyPreset(preset)}
                  data-testid={`cek-profile-preset-${preset.id}`}
                >
                  {t(`cek.profile.preset.${preset.id}`)} ({preset.tp}/{preset.sl})
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cek-profile-tp">{t('cek.profile.tp')}</Label>
              <Input
                id="cek-profile-tp"
                data-testid="cek-profile-tp"
                type="number"
                min={RISK_TP_OPTIONS[0]}
                max={50}
                value={String(choice.tp)}
                onChange={(e) => patch({ tp: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cek-profile-h">{t('cek.profile.h')}</Label>
              <select
                id="cek-profile-h"
                data-testid="cek-profile-h"
                value={choice.h}
                onChange={(e) => patch({ h: Number(e.target.value) })}
                className="cursor-pointer rounded-md border bg-background px-2 py-1 text-sm"
              >
                {RISK_H_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cek-profile-sl">{t('cek.profile.sl')}</Label>
            <div className="flex items-center gap-3">
              <input
                id="cek-profile-sl"
                type="number"
                data-testid="cek-profile-sl"
                min={RISK_SL_OPTIONS[0]}
                max={50}
                disabled={choice.sl === 'none'}
                value={choice.sl === 'none' ? '' : String(choice.sl)}
                onChange={(e) => patch({ sl: Number(e.target.value) })}
                className="w-24 rounded-md border bg-background px-2 py-1 text-sm disabled:opacity-50"
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  data-testid="cek-profile-nosl"
                  checked={choice.sl === 'none'}
                  onChange={(e) => patch({ sl: e.target.checked ? 'none' : 15 })}
                />
                {t('cek.profile.noSl')}
              </label>
            </div>
          </div>

          {approx && (
            <p className="text-xs text-warning" data-testid="cek-profile-approx">
              {t('cek.profile.approx', {
                tp: used.tp,
                sl: used.sl === 'none' ? t('cek.profile.noSl') : `${used.sl}%`,
                h: used.h,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {cell === null ? (
        <p className="text-sm text-muted-foreground" data-testid="cek-profile-nodata">
          {t('cek.profile.nodata')}
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('cek.profile.stats')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={t('cek.profile.rr')}>
                {cell.r_r === null ? (
                  '—'
                ) : (
                  <Numeric value={cell.r_r} kind="decimal" precision={2} direction="none" />
                )}
              </Stat>
              <Stat label={t('cek.profile.breakeven')}>
                <PctMag value={cell.breakeven} />
              </Stat>
              <Stat label={t('cek.profile.pTp')}>
                <PctMag value={cell.p_tp} />
              </Stat>
              <Stat label={t('cek.profile.delta')}>
                <PctSigned value={cell.breakeven === null ? null : cell.p_tp - cell.breakeven} />
              </Stat>
              <Stat label={t('cek.profile.pSl')}>
                <PctMag value={cell.p_sl} />
              </Stat>
              <Stat label={t('cek.profile.eNet')}>
                <PctSigned value={cell.e_net} />
              </Stat>
              <Stat label={t('cek.profile.median')}>
                <PctSigned value={cell.median} />
              </Stat>
              <Stat label={t('cek.profile.p5')}>
                <PctSigned value={cell.p5} />
              </Stat>
              <Stat label={t('cek.profile.p1min')}>
                <PctSigned value={cell.p1} /> / <PctSigned value={cell.min} />
              </Stat>
              <Stat label={t('cek.profile.loss10')}>
                <PctMag value={cell.p_loss10} />
              </Stat>
              <Stat label={t('cek.profile.loss20')}>
                <PctMag value={cell.p_loss20} />
              </Stat>
              <Stat label={t('cek.profile.loss40')}>
                <PctMag value={cell.p_loss40} />
              </Stat>
            </div>

            <OutcomeBar cell={cell} />
            <BreakevenGauge cell={cell} />

            <Row label={t('cek.profile.freq')}>
              <Numeric value={cell.n} kind="integer" direction="none" />
            </Row>

            {fragile && (
              <p
                className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning"
                data-testid="cek-profile-warn-fragile"
              >
                {t('cek.profile.warn.fragile')}
              </p>
            )}
            {deepTail && (
              <p
                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                data-testid="cek-profile-warn-tail"
              >
                {t('cek.profile.warn.tail')}
              </p>
            )}

            <p className="text-xs text-muted-foreground" data-testid="cek-profile-insample">
              {t('cek.profile.insample', {
                basis: RISK_PROFILE.label_basis,
                date: RISK_PROFILE.generated.slice(0, 10),
              })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProfilRisikoPanel;
