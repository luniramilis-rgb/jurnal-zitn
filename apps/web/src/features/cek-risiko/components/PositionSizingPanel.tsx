import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { MessageKey } from '@jurnal-zitn/shared';

import { Numeric } from '@/components/Numeric';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useT } from '@/hooks/useLocale';
import { currencySymbol, formatGroupedInt } from '@/lib/format';

import { usePortfolioSizing } from '../hooks/usePortfolioSizing';
import { useRiskProfile } from '../hooks/useRiskProfile';
import { useRiskProfileData } from '../hooks/useRiskProfileData';
import {
  RISK_MARKET_META,
  lookupRiskProfile,
  portfolioComponents,
  type RiskProfileCell,
} from '../lib/risk-profile';

import { HitungLotPanel } from './HitungLotPanel';

type Mode = 'with-sl' | 'no-sl';

function Money({ value, currency }: { value: number; currency: string }) {
  return <Numeric value={value} kind="money" currency={currency} precision={0} direction="none" />;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

/** Mode **Tanpa SL**: ukuran dari bobot×slot (eksposur) + **anggaran ekor** (rugi simultan P5). */
function NoSlSizingCard({ cell, currency }: { cell: RiskProfileCell | null; currency: string }) {
  const t = useT();
  const { sizing, setSizing } = usePortfolioSizing();
  const accounts = useAccounts();
  const accountList = accounts.data ?? [];

  const prefilled = useRef(false);
  useEffect(() => {
    if (accounts.isLoading || prefilled.current) return;
    prefilled.current = true;
    const balance = accountList.find((a) => a.currency === currency)?.balance;
    const n = balance === undefined ? NaN : Math.round(Number(balance));
    if (!Number.isFinite(n) || n <= 0) return;
    setSizing({ ...sizing, capital: n, currency });
  }, [accounts.isLoading, accountList, currency, sizing, setSizing]);

  const pc = cell ? portfolioComponents(cell, sizing.w, sizing.s) : null;
  const hasCapital = sizing.capital > 0;
  const money = (fraction: number) =>
    Math.min(Number.MAX_SAFE_INTEGER, Math.round(sizing.capital * fraction));

  return (
    <Card data-testid="cek-sizing-nosl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('cek.sizing.noSlTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cek-sizing-capital">{t('cek.profile.portfolio.capital')}</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground" data-testid="cek-sizing-currency">
                {currencySymbol(currency)}
              </span>
              <Input
                id="cek-sizing-capital"
                data-testid="cek-sizing-capital"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="flex-1"
                value={sizing.capital === 0 ? '' : formatGroupedInt(sizing.capital)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '');
                  setSizing({ ...sizing, capital: digits === '' ? 0 : Number(digits) });
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cek-sizing-w">{t('cek.profile.portfolio.weight')}</Label>
            <Input
              id="cek-sizing-w"
              data-testid="cek-sizing-w"
              type="number"
              min={1}
              max={100}
              value={String(sizing.w)}
              onChange={(e) => setSizing({ ...sizing, w: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cek-sizing-s">{t('cek.profile.portfolio.slots')}</Label>
            <Input
              id="cek-sizing-s"
              data-testid="cek-sizing-s"
              type="number"
              min={1}
              max={100}
              value={String(sizing.s)}
              onChange={(e) => setSizing({ ...sizing, s: Number(e.target.value) })}
            />
          </div>
        </div>

        {hasCapital && pc ? (
          <div className="space-y-2">
            <Row label={t('cek.profile.portfolio.perPosition')}>
              <Money value={money(sizing.w / 100)} currency={currency} />
            </Row>
            <Row label={t('cek.profile.portfolio.exposureMax')}>
              <Money value={money(pc.exposureMax)} currency={currency} />
            </Row>
            <Row label={t('cek.profile.portfolio.worstOne')}>
              <Money value={money(pc.worstOne)} currency={currency} />
            </Row>
            <Row label={t('cek.profile.portfolio.p5One')}>
              <Money value={money(pc.p5One)} currency={currency} />
            </Row>
            <Row label={t('cek.sizing.tailBudget')}>
              <Money value={money(pc.simultaneousP5)} currency={currency} />
            </Row>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="cek-sizing-nosl-hint">
            {t('cek.profile.portfolio.fillCapital')}
          </p>
        )}

        <p className="text-xs text-muted-foreground" data-testid="cek-sizing-nosl-note">
          {t('cek.sizing.noSlNote')}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Satu permukaan sizing "Hitung Posisi" (ZITN-TECH-063): mode **Dengan SL** (risk-based, panel
 * hitung-lot) atau **Tanpa SL** (bobot×slot + anggaran ekor). Mode **otomatis** dari rencana/sel
 * terpilih (ada/tidak `p_sl`), bisa di-override manual. Pasar US "Dengan SL" (shares) menyusul.
 */
export function PositionSizingPanel() {
  const t = useT();
  const { choice } = useRiskProfile();
  const { data: profile } = useRiskProfileData(choice.market);
  const { cell } = lookupRiskProfile(profile ?? null, choice);
  const currency = RISK_MARKET_META[choice.market].currency;

  const auto: Mode = cell?.p_sl != null ? 'with-sl' : 'no-sl';
  const [override, setOverride] = useState<Mode | null>(null);
  const mode: Mode = override ?? auto;
  const effective: Mode = mode;

  const modeButton = (value: Mode, label: MessageKey) => (
    <button
      type="button"
      data-testid={`cek-sizing-${value}`}
      aria-pressed={effective === value}
      onClick={() => setOverride(value)}
      className={`cursor-pointer rounded-md border px-3 py-1 text-sm ${
        effective === value ? 'bg-primary text-primary-foreground' : 'bg-background'
      }`}
    >
      {t(label)}
    </button>
  );

  return (
    <div className="space-y-4" data-testid="cek-sizing">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('cek.sizing.mode')}</span>
        {modeButton('with-sl', 'cek.sizing.withSl')}
        {modeButton('no-sl', 'cek.sizing.noSl')}
      </div>
      {effective === 'with-sl' ? (
        <HitungLotPanel market={choice.market === 'id' ? 'idx' : 'us'} />
      ) : (
        <NoSlSizingCard cell={cell} currency={currency} />
      )}
    </div>
  );
}
